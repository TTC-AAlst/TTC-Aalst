import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../utils/test-utils';
import http from '../../../utils/httpClient';
import { AdminPlayers } from '../AdminPlayers';

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

describe('AdminPlayers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens the new member search on the Nieuw lid tab', () => {
    vi.spyOn(http, 'get').mockResolvedValue([]);
    renderWithProviders(<AdminPlayers />);

    fireEvent.click(screen.getByText('Nieuw lid'));

    expect(screen.getByPlaceholderText('Naam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoek VTTL' })).toBeInTheDocument();
  });
});
