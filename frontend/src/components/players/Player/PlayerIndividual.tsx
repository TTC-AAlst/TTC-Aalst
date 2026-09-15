import Table from 'react-bootstrap/Table';
import { getPlayerStats } from '../../../models/TeamModel';
import { WonLostLabel } from '../../controls/controls/WonLostLabel';
import { PercentageLabel } from '../../controls/controls/PercentageLabel';
import { t } from '../../../locales';
import { Competition, IPlayer } from '../../../models/model-interfaces';
import { useTtcSelector } from '../../../utils/hooks/storeHooks';
import { selectPlayerMatches } from '../../../reducers/selectors/selectPlayerMatches';

type PlayerIndividualProps = {
  player: IPlayer;
  competition: Competition;
};

export const PlayerIndividual = ({ player, competition }: PlayerIndividualProps) => {
  const matches = useTtcSelector(state => selectPlayerMatches(state, player.id));
  const comp = player.getCompetition(competition);
  if (!comp.ranking) {
    return null;
  }

  const matchesWithPlayer = matches.filter(match => match.isSyncedWithFrenoy && match.competition === competition);

  const playerResults = getPlayerStats(matchesWithPlayer, true).find(stats => stats.ply.id === player.id);

  if (!playerResults) {
    return <span>{t('match.opponents.noMatchesPlayed')}</span>;
  }

  const playedAgainst = Object.keys(playerResults.lost)
    .concat(Object.keys(playerResults.won))
    .concat([comp.ranking])
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => a.localeCompare(b));

  const total = {
    won: playerResults.victories,
    lost: playerResults.games - playerResults.victories,
    total: playerResults.games,
    bellesWon: playerResults.belleVictories,
    bellesLost: playerResults.belleGames - playerResults.belleVictories,
  };

  return (
    <Table size="sm" striped style={{ maxWidth: 350 }}>
      <thead>
        <tr>
          <th colSpan={2}>{t('match.opponents.victories')}</th>
          <th style={{ width: 30, textAlign: 'right' }}>%</th>
          <th style={{ width: 120 }}>{t('common.belles')}</th>
        </tr>
      </thead>
      <tbody>
        {playedAgainst.map(ranking => {
          const won = playerResults.won[ranking] || 0;
          const lost = playerResults.lost[ranking] || 0;
          const belles = playerResults.belles[ranking];

          return (
            <tr key={ranking} className={comp.ranking === ranking ? 'accentuate' : undefined}>
              <td>{ranking}</td>
              <td>
                <WonLostLabel won={won} lost={lost} />
              </td>
              <td>
                <PercentageLabel won={won} lost={lost} heat />
              </td>
              <td>{belles ? <WonLostLabel won={belles.won} lost={belles.lost} /> : null}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="accentuate">
          <td>{total.total}</td>
          <td>
            <WonLostLabel won={total.won} lost={total.lost} />
          </td>
          <td>
            <PercentageLabel won={total.won} lost={total.lost} decimals={2} heat />
          </td>
          <td>
            <WonLostLabel won={total.bellesWon} lost={total.bellesLost} />
          </td>
        </tr>
      </tfoot>
    </Table>
  );
};
