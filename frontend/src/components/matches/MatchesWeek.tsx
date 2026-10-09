import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MatchesTable } from './MatchesTable';
import { MatchesWeekEmail } from './MatchesWeeks/MatchesWeekEmail';
import { WeekTitle } from './MatchesWeeks/WeekTitle';
import { WeekCalcer } from './MatchesWeeks/WeekCalcer';
import { ToogLines } from '../toog/ToogAssignments';
import { ButtonStack } from '../controls/Buttons/ButtonStack';
import { EditButton } from '../controls/Buttons/EditButton';
import { Competition, IMatch } from '../../models/model-interfaces';
import { t } from '../../locales';
import { selectFreeMatches, selectMatches, selectUser, useTtcSelector } from '../../utils/hooks/storeHooks';

export const MatchesWeek = () => {
  const user = useTtcSelector(selectUser);
  const { week, comp } = useParams();
  const [currentWeek, setCurrentWeek] = useState(week ? parseInt(week, 10) : undefined);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const realMatches = useTtcSelector(selectMatches);
  const freeMatches = useTtcSelector(selectFreeMatches);

  const onChangeWeek = (curWeek: number, weekDiff: number) => {
    const compFilter = comp && comp !== 'all' ? `/${comp}` : '';
    navigate(`${t.route('matchesWeek')}/${curWeek + weekDiff}${compFilter}`);
    setCurrentWeek(curWeek + weekDiff);
  };

  const onChangeCompetition = (curWeek: number, competition: string) => {
    navigate(`${t.route('matchesWeek')}/${curWeek}${competition && competition !== 'all' ? `/${competition}` : ''}`);
  };

  let allMatches = realMatches;
  if (editMode) {
    allMatches = allMatches.concat(freeMatches);
  }

  const weekCalcer = new WeekCalcer(allMatches, currentWeek, editMode);
  const matches = weekCalcer.getMatches();
  if (matches.length === 0) {
    return null;
  }

  const compFilter = (comp || 'all') as Competition | 'all';

  let matchMailing: React.ReactNode = null;
  if (compFilter !== 'all' && user.isAdmin() && matches.some(m => !m.isSyncedWithFrenoy)) {
    let prevMatches = [] as IMatch[];
    const curWeek = currentWeek || 1;
    if (curWeek > 1) {
      let prevWeekCalc = new WeekCalcer(allMatches, curWeek - 1, editMode);
      prevMatches = prevWeekCalc.getMatches().filter(m => m.competition === compFilter);
      if (curWeek > 2 && prevMatches.length === 0) {
        prevWeekCalc = new WeekCalcer(allMatches, curWeek - 2, editMode);
        prevMatches = prevWeekCalc.getMatches();
      }
    }
    matchMailing = (
      <MatchesWeekEmail
        weekCalcer={weekCalcer}
        matches={matches.filter(x => !compFilter || x.competition === compFilter).filter(x => x.shouldBePlayed)}
        prevMatches={prevMatches.filter(x => !compFilter || x.competition === compFilter).filter(x => x.shouldBePlayed)}
        compFilter={compFilter}
      />
    );
  }

  const viewsConfig = [
    { key: 'all', text: t('common.all') },
    { key: 'Vttl', text: 'Vttl' },
    { key: 'Sporta', text: 'Sporta' },
  ];

  return (
    <div style={{ paddingTop: 25 }}>
      <WeekTitle weekCalcer={weekCalcer} weekChange={(diff: number) => onChangeWeek(weekCalcer.currentWeek, diff)} />

      <span className="button-bar-right">
        <ButtonStack
          config={viewsConfig}
          small={false}
          activeView={compFilter}
          onClick={newCompFilter => onChangeCompetition(weekCalcer.currentWeek, newCompFilter)}
        />

        {user.canManageTeams() && matches.some(m => !m.isSyncedWithFrenoy) ? <EditButton onClick={() => setEditMode(!editMode)} /> : null}

        {matchMailing}
      </span>

      {compFilter !== 'Sporta' ? <MatchesWeekPerCompetition comp="Vttl" editMode={editMode} matches={matches} /> : null}
      {compFilter !== 'Vttl' && compFilter !== 'Sporta' ? <hr style={{ marginLeft: '10%', marginRight: '10%', marginTop: 50 }} /> : null}
      {compFilter !== 'Vttl' ? <MatchesWeekPerCompetition comp="Sporta" editMode={editMode} matches={matches} /> : null}

      <ToogLines days={matches.filter(m => m.isHomeMatch && (compFilter === 'all' || m.competition === compFilter)).map(m => m.date)} />
    </div>
  );
};

type MatchesWeekPerCompetitionProps = {
  comp: Competition;
  editMode: boolean;
  matches: IMatch[];
};

const MatchesWeekPerCompetition = ({ comp, editMode, matches }: MatchesWeekPerCompetitionProps) => {
  const matchSorter = (a: IMatch, b: IMatch) => a.getTeam().teamCode.localeCompare(b.getTeam().teamCode);

  matches = matches.filter(x => x.competition === comp);
  if (matches.length === 0) {
    return null;
  }

  return (
    <div>
      <h4>
        <strong>{comp}</strong>
      </h4>
      <MatchesTable editMode={editMode} matches={matches.sort(matchSorter)} ownTeamLink="week" />
    </div>
  );
};
