import { useState } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import cn from 'classnames';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import { matchOutcome } from '../../../models/MatchModel';
import { OpponentPlayerLabel } from './OpponentPlayer';
import { Icon } from '../../controls/Icons/Icon';
import { TrophyIcon } from '../../controls/Icons/TrophyIcon';
import { PlayerLink } from '../../players/controls/PlayerLink';
import { FrenoyLink, FrenoyWeekLink } from '../../controls/Buttons/FrenoyButton';
import { IMatch, Competition, IGetGameMatches, IMatchPlayer } from '../../../models/model-interfaces';
import { t } from '../../../locales';
import storeUtil from '../../../storeUtil';
import { useViewport } from '../../../utils/hooks/useViewport';
import { PreviousEncounters, PreviousEncountersButtonModal } from './PreviousEncounters';
import { SetScores } from './SetScores';
import { useTtcSelector } from '../../../utils/hooks/storeHooks';
import { RootState } from '../../../store';

type SetScoresToggleProps = {
  games: IGetGameMatches[];
  shown: boolean;
  onToggle: () => void;
};

const SetScoresToggle = ({ games, shown, onToggle }: SetScoresToggleProps) => {
  if (!games.some(game => game.setScores.length)) {
    return null;
  }
  return (
    <Button
      variant="outline-secondary"
      size="sm"
      className="set-scores-toggle"
      onClick={onToggle}
      aria-expanded={shown}
      aria-label={t('match.individual.setDetails')}
    >
      <Icon fa={shown ? 'fa fa-chevron-up' : 'fa fa-chevron-down'} translate tooltip="match.individual.setDetails" />
    </Button>
  );
};

type IndividualMatchesProps = {
  match: IMatch;
  ownPlayerId: number;
};

export const IndividualMatches = ({ match, ownPlayerId }: IndividualMatchesProps) => {
  const [pinnedPlayerId, setPinnedPlayerId] = useState<number | null>(ownPlayerId);
  const [showSetScores, setShowSetScores] = useState(false);
  const isSmallDevice = useViewport().width < 600;
  const matchResult = { home: 0, out: 0 };

  if (match.games.length === 0) {
    return <PreviousEncounters match={match} />;
  }

  const games = match.getGameMatches().sort((a, b) => a.matchNumber - b.matchNumber);

  return (
    <Table size="sm" striped className="match-card-tab-table">
      <thead>
        <tr>
          <th colSpan={2}>
            {t('match.individual.matchTitle')} <FrenoyWeekLink match={match} />
          </th>
          <th>
            {t('match.individual.setsTitle')}
            <SetScoresToggle games={games} shown={showSetScores} onToggle={() => setShowSetScores(!showSetScores)} />
          </th>
          <th>{t('match.individual.resultTitle')}</th>
          <th>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {games.map(game => {
          matchResult[game.homeSets > game.outSets ? 'home' : 'out']++;
          const matchWonTrophy = game.outcome === matchOutcome.Won ? <TrophyIcon style={{ marginRight: 6 }} /> : null;
          const setScores = showSetScores ? <SetScores sets={game.setScores} ownSide={match.isHomeMatch ? 'home' : 'out'} /> : null;
          // Five sets don't fit next to the score on a phone: give them the full table width one row lower
          const ownSetScoreRow = isSmallDevice && showSetScores && game.setScores.length > 0;
          const rowClassName = cn({
            success: game.ownPlayer.playerId === pinnedPlayerId && game.outcome === matchOutcome.Won,
            danger: game.ownPlayer.playerId === pinnedPlayerId && game.outcome !== matchOutcome.Won,
            accentuate: game.ownPlayer.playerId === ownPlayerId,
          });
          const pinPlayer = () => setPinnedPlayerId(pinnedPlayerId === game.ownPlayer.playerId ? null : game.ownPlayer.playerId);
          return [
            <tr key={game.matchNumber} className={cn(rowClassName, { 'set-scores-joined': ownSetScoreRow })} onClick={pinPlayer}>
              {!game.isDoubles ? (
                [
                  <td className={cn({ accentuate: game.outcome === matchOutcome.Won })} key="1">
                    {matchWonTrophy}
                    <PlayerDesc player={game.home} competition={match.competition} />
                  </td>,
                  <td className={cn({ accentuate: game.outcome === matchOutcome.Won })} key="2">
                    <PlayerDesc player={game.out} competition={match.competition} />
                  </td>,
                ]
              ) : (
                <td className={cn({ accentuate: game.outcome === matchOutcome.Won })} key="2" colSpan={2}>
                  {matchWonTrophy}
                  {t('match.double')}
                </td>
              )}
              <td key="3" colSpan={2}>
                <div className="set-scores-cell">
                  <span>
                    {game.homeSets}-{game.outSets}
                  </span>
                  <span>
                    {matchResult.home}-{matchResult.out}
                  </span>
                </div>
                {!ownSetScoreRow && setScores}
              </td>
              <td key="5">{game.isDoubles ? <span>&nbsp;</span> : <PreviousEncountersButton matchId={match.id} players={game} />}</td>
            </tr>,
            ownSetScoreRow ? (
              <tr key={`${game.matchNumber}-sets`} className={rowClassName} onClick={pinPlayer}>
                <td colSpan={5}>{setScores}</td>
              </tr>
            ) : null,
          ];
        })}
      </tbody>
    </Table>
  );
};

const selectPreviousEncounters = createSelector(
  [(state: RootState) => state.matchInfo.previousEncounters, (_, matchId: number) => matchId, (_, __, players: IGetGameMatches) => players],
  (previousEncounters, matchId, players) =>
    previousEncounters
      .filter(encounter => encounter.requestMatchId === matchId)
      .filter(encounter => {
        if (encounter.awayPlayerUniqueId === players.home.uniqueIndex && encounter.homePlayerUniqueId === players.out.uniqueIndex) {
          return true;
        }
        if (encounter.awayPlayerUniqueId === players.out.uniqueIndex && encounter.homePlayerUniqueId === players.home.uniqueIndex) {
          return true;
        }
        return false;
      })
      .sort((a, b) => dayjs(b.matchDate).diff(dayjs(a.matchDate))),
);

const PreviousEncountersButton = ({ matchId, players }: { matchId: number; players: IGetGameMatches }) => {
  const encounters = useTtcSelector(state => selectPreviousEncounters(state, matchId, players));
  return (
    <PreviousEncountersButtonModal encounters={encounters} ourPlayerUniqueIndex={players.home.playerId ? players.home.uniqueIndex : players.out.uniqueIndex} />
  );
};

type PlayerDescProps = {
  player: IMatchPlayer;
  competition: Competition;
};

const PlayerDesc = ({ player, competition }: PlayerDescProps) => {
  const viewport = useViewport();
  if (!player.playerId) {
    return <OpponentPlayerLabel player={player} competition={competition} fullName={viewport.width > 700} />;
  }

  const realPlayer = storeUtil.getPlayer(player.playerId);
  if (realPlayer) {
    return <PlayerLink player={realPlayer} alias={viewport.width < 700} />;
  }
  return <span>{player.alias}</span>;
};

export const ReadonlyIndividualMatches = ({ match }: { match: IMatch }) => {
  const [pinnedPlayerIndex, setPinnedPlayerIndex] = useState(0);
  const [showSetScores, setShowSetScores] = useState(false);
  const isSmallDevice = useViewport().width < 600;
  const matchResult = { home: 0, out: 0 };

  const games = match.getGameMatches().sort((a, b) => a.matchNumber - b.matchNumber);

  return (
    <Table striped size="sm" className="match-card-tab-table">
      <thead>
        <tr>
          <th colSpan={2}>{t('match.report.title')}</th>
          <th>
            {t('match.individual.setsTitle')}
            <SetScoresToggle games={games} shown={showSetScores} onToggle={() => setShowSetScores(!showSetScores)} />
          </th>
          <th>
            <span className="d-none d-sm-inline">{t('match.individual.resultTitle')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {games.map(game => {
          matchResult[game.homeSets > game.outSets ? 'home' : 'out']++;
          const highlightRow = game.home?.uniqueIndex === pinnedPlayerIndex || game.out?.uniqueIndex === pinnedPlayerIndex;
          const setScores = showSetScores ? <SetScores sets={game.setScores} ownSide={match.isHomeMatch ? 'home' : 'out'} /> : null;
          // Five sets don't fit next to the score on a phone: give them the full table width one row lower
          const ownSetScoreRow = isSmallDevice && showSetScores && game.setScores.length > 0;
          return [
            <tr key={game.matchNumber} className={cn({ success: highlightRow, 'set-scores-joined': ownSetScoreRow })}>
              {!game.isDoubles ? (
                [
                  <td key="1">
                    <ReadonlyMatchPlayerLabel
                      competition={match.competition}
                      game={game}
                      homePlayer
                      onClick={() => setPinnedPlayerIndex(game.home.uniqueIndex)}
                    />
                  </td>,
                  <td key="2">
                    <ReadonlyMatchPlayerLabel
                      competition={match.competition}
                      game={game}
                      homePlayer={false}
                      onClick={() => setPinnedPlayerIndex(game.out.uniqueIndex)}
                    />
                  </td>,
                ]
              ) : (
                <td key="2" colSpan={2}>
                  {t('match.double')}
                </td>
              )}
              <td key="3" colSpan={2}>
                <div className="set-scores-cell">
                  <span>
                    {game.homeSets}-{game.outSets}
                  </span>
                  <span>
                    {matchResult.home}-{matchResult.out}
                  </span>
                </div>
                {!ownSetScoreRow && setScores}
              </td>
            </tr>,
            ownSetScoreRow ? (
              <tr key={`${game.matchNumber}-sets`} className={cn({ success: highlightRow })}>
                <td colSpan={4}>{setScores}</td>
              </tr>
            ) : null,
          ];
        })}
      </tbody>
    </Table>
  );
};

type ReadonlyMatchPlayerLabelProps = {
  game: IGetGameMatches;
  homePlayer: boolean;
  competition: Competition;
  onClick: Function;
};

const ReadonlyMatchPlayerLabel = ({ game, homePlayer, competition, onClick }: ReadonlyMatchPlayerLabelProps) => {
  const viewport = useViewport();
  const ply = homePlayer ? game.home : game.out;
  const won = (homePlayer && game.outcome === matchOutcome.Won) || (!homePlayer && game.outcome === matchOutcome.Lost);
  return (
    <span className={cn({ accentuate: won })} style={{ display: 'inline-block' }}>
      {won && viewport.width > 500 ? <TrophyIcon style={{ marginRight: 8 }} /> : null}
      <span role="button" onClick={() => onClick()} className="clickable" tabIndex={0}>
        {viewport.width > 800 ? ply.name : ply.alias}
      </span>
      &nbsp;&nbsp;
      {viewport.width > 350 && (
        <FrenoyLink competition={competition} uniqueIndex={ply.uniqueIndex}>
          {viewport.width > 400 ? `${ply.ranking} ` : null}
        </FrenoyLink>
      )}
    </span>
  );
};
