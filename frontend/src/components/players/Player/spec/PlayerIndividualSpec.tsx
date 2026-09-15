import { vi } from 'vitest';
import { renderWithProviders } from '../../../../utils/test-utils';
import { PlayerIndividual } from '../PlayerIndividual';
import PlayerModel from '../../../../models/PlayerModel';
import { IPlayerCompetition } from '../../../../models/model-interfaces';

const player = new PlayerModel({
  id: 1,
  firstName: 'Jan',
  lastName: 'Peeters',
  vttl: { competition: 'Vttl', ranking: 'C2', uniqueIndex: 1 } as IPlayerCompetition,
});

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn((playerId: number) => ({ id: playerId })),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

const game = (outPlayerUniqueIndex: number, outcome: 'Won' | 'Lost', matchNumber: number) => ({
  matchNumber,
  homePlayerUniqueIndex: 1,
  outPlayerUniqueIndex,
  outcome,
});

const storeMatch = {
  id: 1,
  competition: 'Vttl',
  isSyncedWithFrenoy: true,
  isHomeMatch: true,
  date: '2026-01-10T20:00:00',
  opponent: {},
  comments: [],
  players: [
    { playerId: 1, name: 'Jan Peeters', uniqueIndex: 1, ranking: 'C2' },
    { name: 'opp B2', uniqueIndex: -1, ranking: 'B2' },
    { name: 'opp C4', uniqueIndex: -2, ranking: 'C4' },
  ],
  games: [game(-1, 'Won', 1), game(-1, 'Lost', 2), game(-1, 'Lost', 3), game(-1, 'Lost', 4), game(-1, 'Lost', 5), game(-2, 'Won', 6), game(-2, 'Won', 7)],
};

const renderTable = () =>
  renderWithProviders(<PlayerIndividual player={player} competition="Vttl" />, {
    preloadedState: { matches: [storeMatch] as never },
  });

describe('PlayerIndividual', () => {
  it('paints a cell per ranking the player met', () => {
    const { container } = renderTable();
    const pills = container.querySelectorAll('tbody tr td:nth-child(3) span');
    expect(pills).toHaveLength(2);
  });

  it('paints a poor record against B2 fully red', () => {
    const { container } = renderTable();
    const pills = container.querySelectorAll<HTMLElement>('tbody tr td:nth-child(3) span');
    expect(pills[0]!.textContent).toBe('20%');
    expect(pills[0]!.style.backgroundColor).toBe('rgb(217, 83, 79)');
  });

  it('mutes a perfect but two-game record against C4', () => {
    const { container } = renderTable();
    const pills = container.querySelectorAll<HTMLElement>('tbody tr td:nth-child(3) span');
    expect(pills[1]!.textContent).toBe('100%');
    expect(pills[1]!.style.backgroundColor).toBe('rgb(116, 150, 117)');
  });

  it('paints the totals footer', () => {
    const { container } = renderTable();
    const footer = container.querySelector<HTMLElement>('tfoot tr td:nth-child(3) span');
    expect(footer!.textContent).toBe('42,86%');
    expect(footer!.style.backgroundColor).toBe('rgb(232, 131, 58)');
  });

  it('leaves the own-ranking row unpainted when it has no games', () => {
    const { container } = renderTable();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.querySelector('td:nth-child(3) span')).toBeNull();
  });

  it('keeps the existing table intact', () => {
    const { container } = renderTable();
    expect(container.querySelector('tbody tr.accentuate')).not.toBeNull();
    expect(container.querySelectorAll('thead th')).toHaveLength(3);
    expect(container.querySelector('tfoot')).not.toBeNull();
  });
});

const marek = new PlayerModel({
  id: 344,
  firstName: 'Marek',
  lastName: 'Czyrnek',
  sporta: { competition: 'Sporta', ranking: 'C2', uniqueIndex: 53060 } as IPlayerCompetition,
});

const derbyPlayer = (playerId: number, uniqueIndex: number, ranking: string, home: boolean) => ({
  playerId,
  uniqueIndex,
  ranking,
  home,
  name: `Ply${playerId}`,
  position: 1,
  status: 'Major',
});

const derbyGame = (homePlayerUniqueIndex: number, outPlayerSets: number, matchNumber: number) => ({
  matchNumber,
  homePlayerUniqueIndex,
  outPlayerUniqueIndex: 53060,
  homePlayerSets: 3,
  outPlayerSets,
  outcome: 'Won',
});

// Sporta A 10 - 0 Sporta B: stored once, from Sporta A's side
const derby = {
  id: 77,
  competition: 'Sporta',
  isSyncedWithFrenoy: true,
  date: '2026-01-10T20:00:00',
  teamId: 493,
  opponentTeamId: 494,
  isHomeMatch: true,
  opponent: { clubId: 1, teamCode: 'B' },
  score: { home: 10, out: 0 },
  scoreType: 'Won',
  comments: [],
  players: [derbyPlayer(20, 10630, 'C0', true), derbyPlayer(67, 9339, 'A', true), derbyPlayer(75, 7562, 'B6', true), derbyPlayer(344, 53060, 'C2', false)],
  games: [derbyGame(10630, 2, 1), derbyGame(9339, 0, 6), derbyGame(7562, 2, 9)],
};

describe('PlayerIndividual of a derby loser', () => {
  it('counts the games he played for the other own team', () => {
    const { container } = renderWithProviders(<PlayerIndividual player={marek} competition="Sporta" />, {
      preloadedState: { matches: [derby] as never, teams: [{ id: 493, teamCode: 'A', competition: 'Sporta' }] as never },
    });

    const footer = container.querySelectorAll('tfoot tr td');
    expect(footer[0]!.textContent).toBe('3');
    expect(footer[2]!.textContent).toBe('0%');
    expect(Array.from(container.querySelectorAll('tbody tr td:first-child')).map(td => td.textContent)).toEqual(['A', 'B6', 'C0', 'C2']);
  });
});
