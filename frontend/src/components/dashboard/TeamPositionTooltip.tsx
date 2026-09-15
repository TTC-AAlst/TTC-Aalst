import dayjs from 'dayjs';
import { ChartRow, RaceSeries } from '../controls/charts/chartRows';
import { Icon } from '../controls/Icons/Icon';

export type TeamPositionPoint = {
  week: number;
  position: number;
  teamsInDivision: number;
  division: string;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
};

type TeamPositionTooltipProps = {
  row: ChartRow<TeamPositionPoint>;
  series: RaceSeries<TeamPositionPoint>[];
  activeKey: string | undefined;
};

/** One team's week, not the whole field: the lines here are in different divisions. */
export const TeamPositionTooltip = ({ row, series, activeKey }: TeamPositionTooltipProps) => {
  const team = series.find(s => s.key === activeKey);
  const point = team && row.byKey[team.key];
  if (!team || !point) {
    return null;
  }

  const { meta } = point;
  return (
    <div className="race-chart-tooltip">
      <div className="race-chart-tooltip-week">
        <span className="race-chart-tooltip-badge" style={{ backgroundColor: team.color }}>
          {meta.position} / {meta.teamsInDivision}
        </span>
        {team.label} &middot; {meta.division}
      </div>
      <div className="race-chart-tooltip-team">
        Speelweek {meta.week} &middot; {dayjs(row.weekDate).format('DD/MM/YYYY')}
      </div>
      <div className="race-chart-tooltip-tally">
        <span style={{ color: '#4CAF50' }}>
          <Icon fa="fa fa-thumbs-up" style={{ marginRight: 4 }} />
          {meta.gamesWon}
        </span>
        <span style={{ color: '#FF9800' }}>
          <Icon fa="fa fa-meh-o" style={{ marginRight: 4 }} />
          {meta.gamesDraw}
        </span>
        <span style={{ color: '#f44336' }}>
          <Icon fa="fa fa-thumbs-down" style={{ marginRight: 4 }} />
          {meta.gamesLost}
        </span>
      </div>
    </div>
  );
};
