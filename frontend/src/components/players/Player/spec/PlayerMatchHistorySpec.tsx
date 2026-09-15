import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { PlayerMatchHistory } from '../PlayerMatchHistory';
import PlayerModel from '../../../../models/PlayerModel';
import { OwnClubId } from '../../../../models/ClubModel';
import { IMatchPlayer, IPlayerCompetition } from '../../../../models/model-interfaces';

const marek = new PlayerModel({
  id: 344,
  firstName: 'Marek',
  lastName: 'Czyrnek',
  sporta: { competition: 'Sporta', ranking: 'C2', uniqueIndex: 53060 } as IPlayerCompetition,
});

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn().mockReturnValue({
      id: 494,
      teamCode: 'B',
      competition: 'Sporta',
      getDivisionRanking: () => ({ empty: true }),
      renderOwnTeamTitle: () => 'TTC Aalst B',
    }),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn().mockReturnValue({ id: 1, name: 'TTC Aalst', codeVttl: '', codeSporta: '' }),
    getPlayer: vi.fn((playerId: number) => ({ id: playerId })),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

const matchPlayer = (playerId: number, uniqueIndex: number, name: string, ranking: string, home: boolean): IMatchPlayer =>
  ({ playerId, uniqueIndex, name, alias: name, ranking, home, position: 1, status: 'Major', won: home ? 3 : 0 }) as unknown as IMatchPlayer;

const game = (homePlayerUniqueIndex: number, homePlayerSets: number, outPlayerSets: number, matchNumber: number) => ({
  matchNumber,
  homePlayerUniqueIndex,
  outPlayerUniqueIndex: 53060,
  homePlayerSets,
  outPlayerSets,
  outcome: homePlayerSets > outPlayerSets ? 'Won' : 'Lost',
});

// Sporta A 10 - 0 Sporta B: stored once, from Sporta A's side
const derby = {
  id: 77,
  competition: 'Sporta',
  isSyncedWithFrenoy: true,
  shouldBePlayed: true,
  date: '2026-01-10T20:00:00',
  teamId: 493,
  opponentTeamId: 494,
  isHomeMatch: true,
  opponent: { clubId: OwnClubId, teamCode: 'B' },
  score: { home: 10, out: 0 },
  scoreType: 'Won',
  comments: [],
  players: [
    matchPlayer(20, 10630, 'Wouter', 'C0', true),
    matchPlayer(67, 9339, 'Jasper', 'A', true),
    matchPlayer(75, 7562, 'Sami', 'B6', true),
    matchPlayer(344, 53060, 'Marek', 'C2', false),
  ],
  games: [game(10630, 3, 2, 1), game(9339, 3, 0, 6), game(7562, 3, 2, 9)],
};

const renderHistory = () =>
  renderWithProviders(
    <TestRouter>
      <PlayerMatchHistory player={marek} />
    </TestRouter>,
    { preloadedState: { matches: [derby] as never, teams: [{ id: 493, teamCode: 'A', competition: 'Sporta' }] as never } },
  );

describe('PlayerMatchHistory of a derby loser', () => {
  it('lists every game the player played', () => {
    const { container } = renderHistory();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('shows the sets from the player his own side', () => {
    const { container } = renderHistory();
    const rows = container.querySelectorAll('tbody tr');
    expect(Array.from(rows).map(row => row.querySelector('td:last-child')!.textContent)).toEqual(['2-3', '0-3', '2-3']);
  });

  it('hands out no trophy for a lost game', () => {
    const { container } = renderHistory();
    expect(container.querySelectorAll('tbody .fa-trophy')).toHaveLength(0);
  });

  it('paints the team score as a loss', () => {
    const { container } = renderHistory();
    const badge = container.querySelector('.match-lost');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('10 - 0');
  });

  it('names the opponent, not the player himself', () => {
    const { container } = renderHistory();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]!.textContent).toContain('Wouter');
    expect(rows[0]!.textContent).not.toContain('Marek');
  });
});
