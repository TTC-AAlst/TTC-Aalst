import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { PlayerMatchHistory } from '../PlayerMatchHistory';
import PlayerModel from '../../../../models/PlayerModel';
import { IMatchPlayer, IPlayerCompetition } from '../../../../models/model-interfaces';

const jorn = new PlayerModel({
  id: 36,
  firstName: 'Jorn',
  lastName: 'V',
  vttl: { competition: 'Vttl', ranking: 'C2', uniqueIndex: 511726 } as IPlayerCompetition,
});

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn().mockReturnValue({
      id: 493,
      teamCode: 'A',
      competition: 'Vttl',
      getDivisionRanking: () => ({ empty: true }),
      renderOwnTeamTitle: () => 'TTC Aalst A',
    }),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn().mockReturnValue({ id: 54, name: 'Other', codeVttl: '', codeSporta: '' }),
    getPlayer: vi.fn((playerId: number) => ({ id: playerId })),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

const matchPlayer = (playerId: number, uniqueIndex: number, name: string, home: boolean): IMatchPlayer =>
  ({ playerId, uniqueIndex, name, alias: name, ranking: 'C2', home, position: 1, status: 'Major', won: 0 }) as unknown as IMatchPlayer;

// Away match: Jorn is the Frenoy away player, so his sets are stored the other way round
const awayMatch = {
  id: 77,
  competition: 'Vttl',
  isSyncedWithFrenoy: true,
  shouldBePlayed: true,
  date: '2026-02-13T20:00:00',
  teamId: 493,
  isHomeMatch: false,
  opponent: { clubId: 54, teamCode: 'F' },
  score: { home: 7, out: 9 },
  scoreType: 'Won',
  comments: [],
  players: [matchPlayer(0, 515557, 'Maarten', true), matchPlayer(36, 511726, 'Jorn', false)],
  games: [
    {
      id: 1,
      matchId: 77,
      matchNumber: 1,
      homePlayerUniqueIndex: 515557,
      outPlayerUniqueIndex: 511726,
      homePlayerSets: 1,
      outPlayerSets: 3,
      outcome: 'Won',
      scores: '1|-9,2|8,3|-5,4|-13',
    },
  ],
};

const renderHistory = () =>
  renderWithProviders(
    <TestRouter>
      <PlayerMatchHistory player={jorn} />
    </TestRouter>,
    { preloadedState: { matches: [awayMatch] as never, teams: [{ id: 493, teamCode: 'A', competition: 'Vttl' }] as never } },
  );

const setViewportWidth = (width: number) => {
  window.innerWidth = width;
};

describe('PlayerMatchHistory set scores', () => {
  beforeEach(() => setViewportWidth(1024));

  it('shows the sets from the player his own side', () => {
    const { container } = renderHistory();
    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['11-9', '8-11', '11-5', '15-13']);
  });

  it('marks the sets the player won', () => {
    const { container } = renderHistory();
    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.className.includes('set-score-won'))).toEqual([true, false, true, true]);
  });

  it('keeps the sets on the line of the set count on a desktop', () => {
    const { container } = renderHistory();

    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    const setsCell = container.querySelector('tbody tr td:last-child')!;
    expect(setsCell.textContent).toContain('3-1');
    expect(setsCell.querySelectorAll('.set-score')).toHaveLength(4);
    expect(container.querySelector('.set-scores')!.className).toContain('set-scores-inline');
  });

  it('drops the sets onto a row of their own on a phone', () => {
    setViewportWidth(390);
    const { container } = renderHistory();

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.querySelectorAll('.set-score')).toHaveLength(0);
    expect(rows[0]!.textContent).toContain('3-1');

    const setsRow = rows[1]!.querySelector('td[colspan="2"]')!;
    expect(setsRow).not.toBeNull();
    expect(setsRow.querySelectorAll('.set-score')).toHaveLength(4);
  });

  it('joins the game row to its sets row so no border runs between them', () => {
    setViewportWidth(390);
    const { container } = renderHistory();

    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]!.className).toContain('set-scores-joined');
    expect(rows[1]!.className).not.toContain('set-scores-joined');
  });
});
