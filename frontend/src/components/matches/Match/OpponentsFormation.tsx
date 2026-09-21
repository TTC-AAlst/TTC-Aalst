import { useEffect, useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import Table from 'react-bootstrap/Table';
import { OpponentPlayerLabel } from './OpponentPlayer';
import { Spinner } from '../../controls/controls/Spinner';
import { ThumbsUpIcon, ThumbsDownIcon } from '../../controls/Icons/ThumbsIcons';
import { ITeamOpponent, IMatch, IMatchPlayer, IPlayer } from '../../../models/model-interfaces';
import { t } from '../../../locales';
import { useViewport } from '../../../utils/hooks/useViewport';
import { selectUser, useTtcSelector, useTtcDispatch } from '../../../utils/hooks/storeHooks';
import { selectOpponentMatches } from '../../../reducers/selectors/selectOpponentMatches';
import { RootState } from '../../../store';
import storeUtil from '../../../storeUtil';
import { PreviousEncountersButtonModal } from './PreviousEncounters';
import { OpponentPlayerNoteButton } from './OpponentPlayerNote';
import { getOpponentTeamEncounters } from '../../../reducers/matchInfoReducer';

type OpponentsFormationProps = {
  match: IMatch;
  opponent: ITeamOpponent;
};

interface IMatchFormation {
  player: IMatchPlayer;
  count: number;
  won: number;
}

function getFormation(match: IMatch, matches: ReturnType<typeof selectOpponentMatches>) {
  let opponentPlayers: IMatchPlayer[] = matches.home
    .map(m => m.players)
    .flat()
    .filter(m => m.home);
  opponentPlayers = opponentPlayers.concat(
    matches.away
      .map(m => m.players)
      .flat()
      .filter(m => !m.home),
  );

  // TODO: this assumes that if you forfeited, you lost that match (ply has won but not lost property)
  // could be calculated more correctly by looking at the individual match results
  const result: { [key: number]: IMatchFormation } = {};
  opponentPlayers.forEach(ply => {
    const existing = result[ply.uniqueIndex];
    if (existing) {
      existing.count++;
      existing.won += +ply.won || 0;
    } else {
      result[ply.uniqueIndex] = {
        player: ply,
        count: 1,
        won: +ply.won || 0,
      };
    }
  });

  const matchesPerPlayer = match.getTeamPlayerCount();
  return Object.values(result).map(ply => Object.assign(ply, { lost: matchesPerPlayer * ply.count - ply.won }));
}

export const OpponentsFormation = ({ match, opponent }: OpponentsFormationProps) => {
  const dispatch = useTtcDispatch();
  const viewport = useViewport();
  const user = useTtcSelector(selectUser);
  const opponentMatches = useTtcSelector(state => selectOpponentMatches(state, match, opponent));
  const formations = useMemo(() => getFormation(match, opponentMatches).sort((a, b) => b.count - a.count), [match, opponentMatches]);

  useEffect(() => {
    if (user?.playerId && formations.length > 0) {
      const opponentPlayers = formations.map(f => ({ name: f.player.name, uniqueIndex: f.player.uniqueIndex }));
      dispatch(
        getOpponentTeamEncounters({
          match,
          ourPlayerId: user.playerId,
          opponentPlayers,
        }),
      );
    }
  }, [user?.playerId, formations, match, dispatch]);

  if (formations.length === 0) {
    return (
      <div className="match-card-tab-content">
        <h3>
          <Spinner />
        </h3>
      </div>
    );
  }

  const showTimesPlayed = viewport.width > 600;
  const showFullName = viewport.width > 500;
  const currentPlayer = user?.playerId ? storeUtil.getPlayer(user.playerId) : null;

  return (
    <Table size="sm" striped className="match-card-tab-table">
      <thead>
        <tr>
          <th>{t('match.opponents.player')}</th>
          {showTimesPlayed ? <th>{t('match.opponents.timesPlayed')}</th> : null}
          <th colSpan={2}>{t('match.opponents.victories')}</th>
          {currentPlayer ? <th>&nbsp;</th> : null}
        </tr>
      </thead>
      <tbody>
        {formations.map(f => (
          <tr key={f.player.uniqueIndex}>
            <td>
              <OpponentPlayerLabel player={f.player} competition={match.competition} fullName={showFullName} />
            </td>
            {showTimesPlayed ? <td>{f.count}</td> : null}
            <td>
              <ThumbsUpIcon />
              {f.won}

              <ThumbsDownIcon style={{ marginLeft: 8 }} />
              {f.lost}
            </td>
            <td style={{ textAlign: 'right' }}>{`${((f.won / (f.lost + f.won)) * 100).toFixed(0)}%`}</td>
            {currentPlayer ? (
              <td>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <PreviousEncountersButton ourPlayer={currentPlayer} opponent={f.player} match={match} />
                  <OpponentPlayerNoteButton competition={match.competition} opponentUniqueIndex={f.player.uniqueIndex} opponentName={f.player.name} />
                </div>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const selectOpponentTeamEncounters = createSelector(
  [
    (state: RootState) => state.matchInfo.opponentTeamEncounters,
    (_, ourPlayer: IPlayer) => ourPlayer,
    (_, __, opponent: IMatchPlayer) => opponent,
    (_, __, ___, match: IMatch) => match,
  ],
  (opponentTeamEncounters, ourPlayer, opponent, match) => {
    const opponentKey = `${match.competition.toLowerCase()}-${match.opponent.clubId}-${match.opponent.teamCode}`;
    const encounters = opponentTeamEncounters[opponentKey] || [];

    return encounters
      .filter(encounter => {
        const ourUniqueIndex = ourPlayer.getCompetition(match.competition)?.uniqueIndex;
        if (encounter.awayPlayerUniqueId === ourUniqueIndex && encounter.homePlayerUniqueId === opponent.uniqueIndex) {
          return true;
        }
        if (encounter.awayPlayerUniqueId === opponent.uniqueIndex && encounter.homePlayerUniqueId === ourUniqueIndex) {
          return true;
        }
        return false;
      })
      .sort((a, b) => dayjs(b.matchDate).diff(dayjs(a.matchDate)));
  },
);

const PreviousEncountersButton = ({ ourPlayer, opponent, match }: { ourPlayer: IPlayer; opponent: IMatchPlayer; match: IMatch }) => {
  const encounters = useTtcSelector(state => selectOpponentTeamEncounters(state, ourPlayer, opponent, match));
  return <PreviousEncountersButtonModal encounters={encounters} ourPlayerUniqueIndex={ourPlayer.getCompetition(match.competition)?.uniqueIndex ?? 0} />;
};
