import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../utils/test-utils';
import { PublicTeamStats } from '../PublicTeamStats';
import { TeamPositionWeek } from '../../../reducers/rankingHistoryReducer';
import { IStoreTeam } from '../../../models/model-interfaces';

vi.mock('../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn(),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]), getTeamMatches: vi.fn().mockReturnValue([]) },
  },
}));

const pos = (teamId: number, week: number): TeamPositionWeek => ({
  teamId,
  week,
  weekDate: `2026-09-${7 + week * 7}T00:00:00`,
  position: 3,
  teamsInDivision: 12,
  gamesWon: 0,
  gamesLost: 0,
  gamesDraw: 0,
});

const team = (id: number): IStoreTeam =>
  ({
    id,
    clubId: 1,
    competition: 'Vttl',
    teamCode: 'A',
    divisionName: '1A',
    year: 2026,
    frenoy: { divisionId: 1 },
    players: [],
    opponents: [],
  }) as unknown as IStoreTeam;

const ranking = { clubId: 1, teamCode: 'A', position: 3, gamesWon: 2, gamesLost: 1, gamesDraw: 0, isForfait: false };

const renderStats = (positions: TeamPositionWeek[]) =>
  renderWithProviders(
    <TestRouter>
      <PublicTeamStats />
    </TestRouter>,
    {
      preloadedState: {
        rankingHistory: { divisions: {}, positions } as never,
        teams: [team(1)] as never,
        teamRankings: { 1: [ranking] } as never,
      },
    },
  );

describe('PublicTeamStats', () => {
  it('shows no tabs on a single week', () => {
    const { container } = renderStats([pos(1, 1)]);
    expect(container.querySelector('.nav-tabs')).toBeNull();
  });

  it('offers the graph tab once two weeks exist', () => {
    const { container } = renderStats([pos(1, 1), pos(1, 2)]);
    expect(container.querySelector('.nav-tabs')).not.toBeNull();
  });
});
