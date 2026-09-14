import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { renderWithProviders } from '../../../utils/test-utils';
import { AdminToog } from '../AdminToog';
import http from '../../../utils/httpClient';
import { IToogAdminDay } from '../../../models/model-interfaces';

// storeUtil pulls in the real store, which cycles back through matchesReducer
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

const homeDay = dayjs().add(7, 'day').startOf('day');

const unassignedDay: IToogAdminDay = { date: homeDay.toISOString(), homeTeamIds: [10], availablePlayerIds: [1], assignedPlayerId: null };
const assignedDay: IToogAdminDay = { ...unassignedDay, assignedPlayerId: 1 };

const preloadedState = {
  players: [
    { id: 1, alias: 'Wouter', firstName: 'Wouter', lastName: 'Van Schandevijl' },
    { id: 2, alias: 'Jorn', firstName: 'Jorn', lastName: 'Theunissen' },
  ],
  teams: [{ id: 10, competition: 'Vttl' as const, teamCode: 'A' }],
};

const renderAdminToog = (days: IToogAdminDay[]) => {
  vi.spyOn(http, 'get').mockResolvedValue(days);
  return renderWithProviders(<AdminToog />, { preloadedState });
};

describe('AdminToog', () => {
  beforeEach(() => {
    vi.spyOn(http, 'post').mockResolvedValue([assignedDay]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the home teams and a button per available player', async () => {
    renderAdminToog([unassignedDay]);

    expect(await screen.findByRole('button', { name: 'Wouter' })).toBeInTheDocument();
    expect(screen.getByText('Vttl A')).toBeInTheDocument();
  });

  it('assigns the player when their button is clicked', async () => {
    renderAdminToog([unassignedDay]);

    fireEvent.click(await screen.findByRole('button', { name: 'Wouter' }));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/toog/assign', { date: homeDay.toISOString(), playerId: 1 }));
  });

  it('shows an assigned player who did not volunteer', async () => {
    renderAdminToog([{ ...unassignedDay, availablePlayerIds: [], assignedPlayerId: 1 }]);

    expect(await screen.findByRole('button', { name: 'Wouter' })).toBeInTheDocument();
  });

  it('assigns a player who did not volunteer, through the autocomplete', async () => {
    renderAdminToog([unassignedDay]);
    await screen.findByRole('button', { name: 'Wouter' });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Jorn' } });
    fireEvent.click(await screen.findByText('Jorn Theunissen'));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/toog/assign', { date: homeDay.toISOString(), playerId: 2 }));
  });

  it('marks a day nobody is assigned to', async () => {
    const { container } = renderAdminToog([unassignedDay]);
    await screen.findByRole('button', { name: 'Wouter' });

    expect(container.querySelector('tbody tr')).toHaveClass('table-warning');
  });

  it('clears the assignment', async () => {
    renderAdminToog([assignedDay]);

    fireEvent.click(await screen.findByRole('button', { name: 'Aanduiding wissen' }));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/toog/assign', { date: homeDay.toISOString(), playerId: null }));
  });
});
