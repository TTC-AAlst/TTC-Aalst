import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import { TrophyIcon } from '../../controls/Icons/TrophyIcon';
import MatchVs from '../../matches/Match/MatchVs';
import { MatchDate } from '../../matches/controls/MatchDate';
import { OpponentPlayerLabel } from '../../matches/Match/OpponentPlayer';
import { ViewMatchDetailsButton } from '../../matches/controls/ViewMatchDetailsButton';
import { SetScores } from '../../matches/Match/SetScores';
import { IPlayer } from '../../../models/model-interfaces';
import { useTtcSelector } from '../../../utils/hooks/storeHooks';
import { selectPlayerMatches } from '../../../reducers/selectors/selectPlayerMatches';
import { useViewport } from '../../../utils/hooks/useViewport';
import { t } from '../../../locales';

type PlayerMatchHistoryProps = {
  player: IPlayer;
};

export const PlayerMatchHistory = ({ player }: PlayerMatchHistoryProps) => {
  const matches = useTtcSelector(state => selectPlayerMatches(state, player.id));
  const viewport = useViewport();
  const isSmallDevice = viewport.width < 600;

  const [showVttl, setShowVttl] = useState(true);
  const [showSporta, setShowSporta] = useState(true);

  const playsInBothCompetitions = !!player.vttl && !!player.sporta;

  const toggleVttl = () => {
    if (showVttl && !showSporta) {
      setShowSporta(true);
    }
    setShowVttl(!showVttl);
  };

  const toggleSporta = () => {
    if (showSporta && !showVttl) {
      setShowVttl(true);
    }
    setShowSporta(!showSporta);
  };

  const matchesWithPlayer = matches
    .filter(match => match.isSyncedWithFrenoy && match.games.length)
    .filter(match => {
      if (match.competition === 'Vttl') return showVttl;
      if (match.competition === 'Sporta') return showSporta;
      return true;
    })
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return (
    <Card>
      <Card.Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ marginBottom: 0 }}>{t('match.individual.matchHistory')}</h4>
        {playsInBothCompetitions && (
          <div>
            <Button size="sm" variant={showVttl ? 'primary' : 'outline-primary'} onClick={toggleVttl} style={{ marginRight: 5 }}>
              Vttl
            </Button>
            <Button size="sm" variant={showSporta ? 'primary' : 'outline-primary'} onClick={toggleSporta}>
              Sporta
            </Button>
          </div>
        )}
      </Card.Header>
      <Card.Body>
        <Table size="sm" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>{t('teamCalendar.match')}</th>
              <th>{t('match.individual.opponentPlayer')}</th>
              <th>{t('match.individual.setsTitle')}</th>
            </tr>
          </thead>
          <tbody>
            {matchesWithPlayer.map((match, matchIndex) => {
              const games = match
                .getGameMatches()
                .filter(game => !game.isDoubles)
                .filter(game => game.home.playerId === player.id || game.out.playerId === player.id);

              const isEvenMatch = matchIndex % 2 === 0;
              // On a phone the sets get a row of their own, so the match cell has to span those too
              const ownSetScoreRow = (game: (typeof games)[number]) => isSmallDevice && game.setScores.length > 0;
              const rowSpan = games.length + games.filter(ownSetScoreRow).length;

              return games.map((game, index) => {
                const opponentPlayer = match.isHomeMatch ? game.out : game.home;
                const playerWon = (match.isHomeMatch && game.homeSets > game.outSets) || (!match.isHomeMatch && game.outSets > game.homeSets);
                const setScores = <SetScores sets={game.setScores} flip={!match.isHomeMatch} inline={!isSmallDevice} />;

                return [
                  <tr key={`${match.id}-${game.matchNumber}`} className={isEvenMatch ? '' : 'table-info'}>
                    {index === 0 ? (
                      <td rowSpan={rowSpan}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>
                              <MatchDate match={match} />
                            </div>
                            <MatchVs match={match} withLinks withPosition={!isSmallDevice} ownTeamLink="matches" />
                          </div>
                          <div style={{ marginRight: 12 }}>
                            <ViewMatchDetailsButton match={match} size={null} />
                          </div>
                        </div>
                      </td>
                    ) : null}
                    <td>
                      {playerWon ? <TrophyIcon style={{ marginRight: 6 }} /> : null}
                      <OpponentPlayerLabel player={opponentPlayer} competition={match.competition} />
                    </td>
                    <td>
                      {match.isHomeMatch ? game.homeSets : game.outSets}-{match.isHomeMatch ? game.outSets : game.homeSets}
                      {!isSmallDevice && setScores}
                    </td>
                  </tr>,
                  ownSetScoreRow(game) ? (
                    <tr key={`${match.id}-${game.matchNumber}-sets`} className={isEvenMatch ? '' : 'table-info'}>
                      <td colSpan={2}>{setScores}</td>
                    </tr>
                  ) : null,
                ];
              });
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};
