import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../utils/test-utils';
import { ClubTournaments } from '../ClubTournaments';
import http from '../../../utils/httpClient';

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

const tournaments = [
  {
    id: 2,
    slug: 'clubkampioenschap-2026',
    name: 'Clubkampioenschap 2026',
    eventType: 'Clubkampioenschap',
    type: 'enkel',
    date: '2026-12-14T00:00:00',
    winner: 'Pieter Van Damme',
    url: 'https://tournooike.ttc-aalst.be/clubkampioenschap-2026',
    results: {
      playerCount: 12,
      top4: [
        { place: 1, name: 'Pieter Van Damme', klassement: 'B6' },
        { place: 2, name: 'Luc Mertens', klassement: 'D2' },
        { place: 3, name: 'Wim Janssens', klassement: 'C6' },
        { place: 4, name: 'Dirk Wouters', klassement: 'C4' },
      ],
      troost: [{ place: 1, name: 'Ann Jacobs' }],
      notableWins: [{ winner: 'Sara Willems', winnerKlassement: 'E4', loser: 'Koen Maes', loserKlassement: 'D0', diff: 7, round: 'Poule B', score: '3-2' }],
    },
  },
  {
    id: 1,
    slug: 'clubkampioenschap-2025',
    name: 'Clubkampioenschap 2025',
    eventType: 'Clubkampioenschap',
    type: 'enkel',
    date: '2025-12-13T00:00:00',
    winner: 'Tom Claes',
    url: 'https://tournooike.ttc-aalst.be/clubkampioenschap-2025',
    results: {},
  },
];

describe('ClubTournaments', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the latest tournament with podium, notable wins and honour roll', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(tournaments);
    renderWithProviders(<ClubTournaments />);

    expect(await screen.findByText('Clubkampioenschap 2026')).toBeInTheDocument();
    expect(http.get).toHaveBeenCalledWith('/club-tournaments');
    expect(screen.getAllByText('Pieter Van Damme').length).toBeGreaterThan(0);
    expect(screen.getByText(/Luc Mertens/)).toBeInTheDocument();
    expect(screen.getByText(/Sara Willems \(E4\) won van Koen Maes \(D0\)/)).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('Clubkampioenschap 2025')).toBeInTheDocument();
    expect(screen.getByText(/Ann Jacobs/)).toBeInTheDocument();
  });

  it('shows a message when no tournaments were played', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([]);
    renderWithProviders(<ClubTournaments />);

    expect(await screen.findByText('Nog geen clubtornooien gespeeld.')).toBeInTheDocument();
  });
});
