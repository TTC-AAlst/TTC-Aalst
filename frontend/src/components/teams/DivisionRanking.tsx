import { useEffect } from 'react';
import Table from 'react-bootstrap/Table';
import cn from 'classnames';
import { OwnClubId } from '../../models/ClubModel';
import { OpponentLink } from './controls/OpponentLink';
import { t } from '../../locales';
import { ITeam } from '../../models/model-interfaces';
import { useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';
import { loadRankingHistory } from '../../reducers/rankingHistoryReducer';
import { DivisionPointsRace } from './DivisionPointsRace';

type DivisionRankingProps = {
  team: ITeam;
};

export const DivisionRanking = ({ team }: DivisionRankingProps) => {
  const dispatch = useTtcDispatch();
  const ownTeamCodes = useTtcSelector(state =>
    state.teams.filter(ownTeam => ownTeam.frenoy.divisionId === team.frenoy.divisionId).map(ownTeam => ownTeam.teamCode),
  );

  useEffect(() => {
    dispatch(loadRankingHistory({ team }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.frenoy.divisionId]);

  return (
    <>
      <DivisionPointsRace divisionId={team.frenoy.divisionId} ownClubId={OwnClubId} ownTeamCodes={ownTeamCodes} />
      <Table size="sm" hover>
        <thead>
          <tr>
            <th>{t('teamCalendar.position')}</th>
            <th>{t('teamCalendar.name')}</th>
            <th className="d-none d-sm-table-cell">{t('teamCalendar.matchesWon')}</th>
            <th className="d-none d-sm-table-cell">{t('teamCalendar.matchesLost')}</th>
            <th className="d-none d-sm-table-cell">{t('teamCalendar.matchesDraw')}</th>
            <th>{t('teamCalendar.points')}</th>
          </tr>
        </thead>
        <tbody>
          {team.ranking.map(teamRanking => (
            <tr
              className={cn({ 'match-won accentuate': teamRanking.clubId === OwnClubId, irrelevant: teamRanking.isForfait })}
              key={teamRanking.clubId + teamRanking.teamCode}
            >
              <td>{teamRanking.position}</td>
              <td>
                <OpponentLink team={team} opponent={{ clubId: teamRanking.clubId, teamCode: teamRanking.teamCode }} withPosition={false} />
              </td>
              <td className="d-none d-sm-table-cell">{teamRanking.gamesWon}</td>
              <td className="d-none d-sm-table-cell">{teamRanking.gamesLost}</td>
              <td className="d-none d-sm-table-cell">{teamRanking.gamesDraw}</td>
              <td>{teamRanking.points}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
};
