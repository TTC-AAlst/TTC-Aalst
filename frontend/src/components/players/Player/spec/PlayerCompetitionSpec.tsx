import { vi } from 'vitest';
import { renderWithProviders } from '../../../../utils/test-utils';
import { PlayerCompetition } from '../PlayerCompetition';
import PlayerModel from '../../../../models/PlayerModel';
import { IMatchPlayer, IPlayerCompetition } from '../../../../models/model-interfaces';

const marek = new PlayerModel({
  id: 344,
  firstName: 'Marek',
  lastName: 'Czyrnek',
  sporta: { competition: 'Sporta', ranking: 'C2', uniqueIndex: 53060 } as IPlayerCompetition,
});

const teams = [
  { id: 493, teamCode: 'A', competition: 'Sporta', divisionName: '3A', players: [{ playerId: 344, type: 'Standard' }] },
  { id: 494, teamCode: 'B', competition: 'Sporta', divisionName: '4C', players: [{ playerId: 344, type: 'Standard' }] },
];

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn(() =>
      teams.map(team => ({ ...team, getDivisionDescription: () => `Prov ${team.divisionName}`, getDivisionRanking: () => ({ empty: true }) })),
    ),
    getClub: vi.fn(),
    getPlayer: vi.fn((playerId: number) => ({ id: playerId })),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

const matchPlayer = (playerId: number, uniqueIndex: number, home: boolean): IMatchPlayer =>
  ({ playerId, uniqueIndex, home, name: `Ply${playerId}`, ranking: 'C2', position: 1, status: 'Major' }) as unknown as IMatchPlayer;

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
  players: [matchPlayer(20, 10630, true), matchPlayer(344, 53060, false)],
  games: [{ matchNumber: 1, homePlayerUniqueIndex: 10630, outPlayerUniqueIndex: 53060, homePlayerSets: 3, outPlayerSets: 2, outcome: 'Won' }],
};

const renderCard = (matches: unknown[]) =>
  renderWithProviders(<PlayerCompetition player={marek} competition="Sporta" />, {
    preloadedState: { matches: matches as never, teams: teams as never, config: { params: { endOfSeason: false } } as never },
  });

describe('PlayerCompetition', () => {
  it('titles the card with the team he played the derby for', () => {
    const { container } = renderCard([derby]);
    expect(container.querySelector('.card-header')!.textContent).toContain('Sporta B');
  });

  it('falls back to his roster team when he has not played yet', () => {
    const { container } = renderCard([]);
    expect(container.querySelector('.card-header')!.textContent).toContain('Sporta A');
  });
});
