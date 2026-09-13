import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { downloadTeamsExcel } from '../../utils/httpClient';
import { TabbedContainer, TabKey } from '../controls/TabbedContainer';
import { DivisionRanking } from './DivisionRanking';
import { TeamOverview } from './TeamOverview';
import { TeamHeader } from './controls/TeamHeader';
import { TeamTabTitle } from './controls/TeamTabTitle';
import { SwitchBetweenFirstAndLastRoundButton, getFirstOrLastMatches, getFirstOrLast } from './SwitchBetweenFirstAndLastRoundButton';
import { PlayersCardGallery } from '../players/PlayersCardGallery';
import { MatchesTable } from '../matches/MatchesTable';
import { TeamMatchesWeek } from './TeamMatchesWeek';
import { ButtonStack } from '../controls/Buttons/ButtonStack';
import { SaveButton } from '../controls/Buttons/SaveButton';
import { EditButton } from '../controls/Buttons/EditButton';
import { ExcelButton } from '../controls/Buttons/ExcelButton';
import { FrenoyButton } from '../controls/Buttons/FrenoyButton';
import { t } from '../../locales';
import { selectMatches, selectTeams, selectUser, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';
import { useViewport } from '../../utils/hooks/useViewport';
import { IMatch, ITeam, PickedPlayer } from '../../models/model-interfaces';
import { editMatchPlayers } from '../../reducers/matchesReducer';
import { MatchesTablePlayerLineUp } from '../matches/MatchesTable/MatchesTablePlayerLineUp';
import { MatchesTableEditPlayerLineUp } from '../matches/MatchesTable/MatchesTableEditPlayerLineUp';
import { getPlayerFormation } from '../matches/MatchesTable/matchesTableUtil';
import { getTeamViewKeys } from './teamViewKeys';
import { Icon } from '../controls/Icons/Icon';

export const Teams = () => {
  const dispatch = useTtcDispatch();
  const user = useTtcSelector(selectUser);
  const viewport = useViewport();
  const params = useParams();
  const navigate = useNavigate();
  const teams = useTtcSelector(selectTeams);
  const allMatches = useTtcSelector(selectMatches);
  const [editMode, setEditMode] = useState(false);
  const [matchesFilter, setMatchesFilter] = useState<ReturnType<typeof getFirstOrLast>>(getFirstOrLast());

  const getAlreadyPicked = (): PickedPlayer[] => {
    if (user.canEditMatchesOrIsCaptain()) {
      let alreadyPicked: PickedPlayer[] = [];
      allMatches.forEach(match => {
        const formation = getPlayerFormation(match);
        const matchPicked = formation.map(frm => ({ ...frm, matchId: match.id }));
        alreadyPicked = alreadyPicked.concat(matchPicked);
      });
      return alreadyPicked;
    }
    return [];
  };

  const [tablePlayers, setTablePlayers] = useState(getAlreadyPicked());
  const [tableMatches, setTableMatches] = useState<number[]>([]);

  const getDefaultTeam = () => {
    if (user.playerId) {
      const yourTeams = teams.filter(team => user.teams.includes(team.id)).filter(team => team.competition === params.competition);

      if (yourTeams.length === 0) {
        return 'A';
      }
      if (yourTeams.length === 1) {
        return yourTeams[0]?.teamCode ?? 'A';
      }
      const notReserve = yourTeams.find(x => x.getPlayers('standard').some(p => p.player.id === user.playerId));
      return notReserve ? notReserve.teamCode : (yourTeams[0]?.teamCode ?? 'A');
    }
    return 'A';
  };

  const isSmall = viewport.width < 700;

  const getUrl = (view: string) => {
    let url = t.route('teams', { competition: params.competition ?? 'Vttl' });
    url += `/${params.tabKey || getDefaultTeam()}`;
    if (view !== 'main') {
      url += `/${view}`;
    }
    return url;
  };

  const findTeam = (teamCode: string) => {
    const team = teams.find(x => x.teamCode === teamCode && x.competition === params.competition);
    if (team) {
      return team;
    }
    // BUG: When navigating from Vttl F to Sporta, there is no Sporta F
    //      In the TabbedContainer, no tab header is selected
    return teams.find(x => x.teamCode === getDefaultTeam() && x.competition === params.competition)!;
  };

  const renderTabContent = (teamCode: string) => {
    const team = findTeam(teamCode);

    const transView = (key: string) => t(`teamCalendar.view.${key}`);
    const viewsConfig = getTeamViewKeys(user, viewport.width).map(v => ({ key: v, text: transView(v) }));

    const view = params.view || 'main';
    const { matches } = getFirstOrLastMatches(team.getMatches(), matchesFilter);
    return (
      <div>
        <div className="button-bar-right" style={{ padding: 12 }}>
          <ExcelButton
            onClick={() => downloadTeamsExcel(t('teamCalendar.downloadExcelFileName'))}
            tooltip={t('teamCalendar.downloadExcel')}
            className={`btn-${params.competition}`}
          />
          <FrenoyButton team={team} linkTo="results" />
          <FrenoyButton team={team} linkTo="ranking" />
        </div>

        <div className="btn-toolbar" style={{ padding: 10 }}>
          <div style={{ marginBottom: 8 }}>
            <ButtonStack config={viewsConfig} small={isSmall} activeView={view} onClick={newView => navigate(getUrl(newView))} />
          </div>

          {view.startsWith('matches') && user.canEditMatchesOrIsCaptain() && matches.some(m => !m.isSyncedWithFrenoy) ? (
            <div className="pull-right" style={{ marginLeft: 5 }}>
              {editMode && view !== 'matches' ? (
                <div style={{ display: 'inline' }}>
                  {user.canManageTeams() && (
                    <button type="button" className="btn btn-success" style={{ marginRight: 5 }} onClick={() => saveAndBlockAll(true, 'Major')}>
                      <Icon fa="fa fa-angle-double-up" style={{ marginRight: 6 }} translate tooltip="match.block.Captain" />
                      {t('match.plys.saveAndBlockAll')}
                    </button>
                  )}
                  <button type="button" className="btn btn-warning" style={{ marginRight: 5 }} onClick={() => saveAndBlockAll(true, 'Captain')}>
                    <Icon fa="fa fa-star" style={{ marginRight: 6 }} translate tooltip="match.block.Captain" />
                    {t('match.plys.saveAndBlockAll')}
                  </button>
                  <SaveButton onClick={() => saveAndBlockAll(false, 'Captain')} title={t('match.plys.tooltipSave')} style={{ marginRight: 5 }} />
                </div>
              ) : null}
              <EditButton onClick={() => setEditMode(!editMode)} fa="" title={t('match.plys.tooltipOpenForm')} />
            </div>
          ) : null}
        </div>
        {view !== 'week' ? <TeamHeader team={team} showRanking={viewport.width > 900} /> : null}
        {renderTabViewContent(team, matches)}
      </div>
    );
  };

  const saveAndBlockAll = (blockAlso: boolean, playerStatus: 'Captain' | 'Major') => {
    if (!tableMatches.length) {
      return;
    }

    const perMatch = tableMatches.reduce(
      (acc, matchId) => {
        acc[matchId] = [];
        return acc;
      },
      {} as { [matchId: number]: PickedPlayer[] },
    );

    tablePlayers.forEach(ply => {
      perMatch[ply.matchId]?.push(ply);
    });

    const team = findTeam(params.tabKey || getDefaultTeam());
    Object.entries(perMatch).forEach(([matchId, plyInfos]) => {
      dispatch(
        editMatchPlayers({
          matchId: parseInt(matchId, 10),
          teamId: team.id,
          playerIds: plyInfos.map(x => x.id),
          blockAlso,
          newStatus: playerStatus,
          comment: '',
        }),
      );
    });

    setTableMatches([]);
  };

  const renderTabViewContent = (team: ITeam, matches: IMatch[]) => {
    switch (params.view) {
      case 'matches':
      case 'matchesTable': {
        const canEditMatches = editMode && matches.some(match => user.canEditMatchPlayers(match));
        return (
          <div>
            {params.view === 'matchesTable' ? (
              <>
                {!canEditMatches && <MatchesTablePlayerLineUp team={team} matches={matches} />}
                {canEditMatches && (
                  <MatchesTableEditPlayerLineUp
                    team={team}
                    matches={matches}
                    tablePlayers={tablePlayers}
                    onTablePlayerSelect={(plyInfos, match) => {
                      setTablePlayers(plyInfos);
                      setTableMatches(tableMatches.concat([match.id]));
                    }}
                  />
                )}
              </>
            ) : (
              <MatchesTable matches={matches} allowOpponentOnly striped editMode={canEditMatches} />
            )}

            <SwitchBetweenFirstAndLastRoundButton setMatchesFilter={setMatchesFilter} matchesFilter={matchesFilter} />
          </div>
        );
      }
      case 'ranking':
        return <DivisionRanking team={team} />;

      case 'players':
        return <PlayersCardGallery players={team.getPlayers().map(x => x.player)} competition={team.competition} />;

      case 'week':
        return <TeamMatchesWeek team={team} />;

      case 'main':
      default:
        return <TeamOverview team={team} small={isSmall} />;
    }
  };

  const tabConfig: TabKey[] = teams
    .filter(team => team.competition === params.competition)
    .map(team => ({
      key: team.teamCode,
      title: '',
      headerChildren: <TeamTabTitle team={team} showRanking={viewport.width < 900} />,
    }));

  return (
    <div style={{ marginTop: 20, marginBottom: 20 }}>
      <TabbedContainer
        selectedTab={params.tabKey || getDefaultTeam()}
        tabKeys={tabConfig}
        tabRenderer={eventKey => renderTabContent(eventKey)}
        route={{ base: t.route('teams', { competition: params.competition ?? 'Vttl' }), suffix: params.view }}
        widthTreshold={900}
      />
    </div>
  );
};
