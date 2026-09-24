import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, TestRouter } from '../../../utils/test-utils';
import AdminTeams from '../AdminTeams';
import http from '../../../utils/httpClient';
import TeamModel from '../../../models/TeamModel';
import PlayerModel from '../../../models/PlayerModel';

// storeUtil pulls in the real store, which cycles back through matchesReducer
vi.mock('../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn(() => new PlayerModel()),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]), getTeamMatches: vi.fn().mockReturnValue([]) },
  },
}));

const activePlayer = { id: 1, alias: 'Wouter', firstName: 'Wouter', lastName: 'Van Schandevijl', active: true };
const quitter = { id: 17, alias: 'Quinten', firstName: 'Quinten', lastName: 'Tester', active: false };

const team = new TeamModel(
  {
    id: 10,
    competition: 'Vttl',
    teamCode: 'D',
    players: [
      { playerId: activePlayer.id, type: 'Standard' },
      { playerId: quitter.id, type: 'Reserve' },
    ],
  } as never,
  [],
);

const renderAdminTeams = () =>
  renderWithProviders(
    <TestRouter>
      <AdminTeams teams={[team]} />
    </TestRouter>,
    { preloadedState: { players: [activePlayer] } as never },
  );

describe('AdminTeams', () => {
  beforeEach(() => {
    vi.spyOn(http, 'get').mockResolvedValue([quitter]);
    vi.spyOn(http, 'post').mockResolvedValue({ ...team, players: [{ playerId: activePlayer.id, type: 'Standard' }] });
  });

  afterEach(() => vi.restoreAllMocks());

  it('removes a team player who quit the club', async () => {
    renderAdminTeams();

    fireEvent.click(await screen.findByRole('button', { name: 'Quinten verwijderen' }));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/teams/ToggleTeamPlayer', { teamId: 10, playerId: 17, role: 'Reserve' }));
  });

  it('does not offer to remove active team players', async () => {
    renderAdminTeams();

    await screen.findByRole('button', { name: 'Quinten verwijderen' });
    expect(screen.queryByRole('button', { name: 'Wouter verwijderen' })).not.toBeInTheDocument();
  });
});
