import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { renderWithProviders } from '../../../utils/test-utils';
import { MyToogNotice, ToogLines, getToogPlayer } from '../ToogAssignments';
import http from '../../../utils/httpClient';
import { IToogAssignment } from '../../../models/model-interfaces';

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

const homeDay = dayjs().add(3, 'day').startOf('day');
const otherDay = homeDay.add(1, 'day');
const assigned: IToogAssignment[] = [{ date: homeDay.toISOString(), playerId: 1 }];

const players = [
  { id: 1, alias: 'Wouter', firstName: 'Wouter', lastName: 'Van Schandevijl' },
  { id: 2, alias: 'Jorn', firstName: 'Jorn', lastName: 'Theunissen' },
];

const render = (days: dayjs.Dayjs[], playerId = 2, showDate?: boolean) => {
  vi.spyOn(http, 'get').mockResolvedValue(assigned);
  return renderWithProviders(<ToogLines days={days} showDate={showDate} />, {
    preloadedState: { players, user: { playerId } },
  });
};

describe('ToogLines', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows who is at the toog on a home day', async () => {
    render([homeDay.hour(20), otherDay.hour(20)]);

    expect(await screen.findByText(new RegExp(`${homeDay.format('ddd D/M')}: Wouter`))).toBeInTheDocument();
    expect(http.get).toHaveBeenCalledWith('/toog/assigned');
    expect(screen.queryByText(new RegExp(otherDay.format('ddd D/M')))).not.toBeInTheDocument();
  });

  it('shows a day only once with multiple home matches', async () => {
    render([homeDay.hour(19), homeDay.hour(20)]);

    expect(await screen.findAllByText(/Wouter/)).toHaveLength(1);
  });

  it('can leave out the date', async () => {
    render([homeDay.hour(20)], 2, false);

    expect(await screen.findByText(/: Wouter/)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(homeDay.format('D/M')))).not.toBeInTheDocument();
  });

  it('fetches nothing when not logged in', async () => {
    render([homeDay.hour(20)], 0);

    await waitFor(() => expect(screen.queryByText(/Wouter/)).not.toBeInTheDocument());
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe('getToogPlayer', () => {
  it('matches on the day, not the time', () => {
    expect(getToogPlayer(assigned, players, homeDay.hour(20))?.alias).toBe('Wouter');
    expect(getToogPlayer(assigned, players, otherDay)).toBeUndefined();
  });
});

describe('MyToogNotice', () => {
  afterEach(() => vi.restoreAllMocks());

  const renderNotice = (playerId: number, rows: IToogAssignment[]) => {
    vi.spyOn(http, 'get').mockResolvedValue(rows);
    return renderWithProviders(<MyToogNotice />, { preloadedState: { players, user: { playerId } } });
  };

  it('reminds the logged in player of their toog day', async () => {
    renderNotice(1, assigned);

    expect(await screen.findByText(`Je staat ${homeDay.format('dddd D/M')} aan de toog`)).toBeInTheDocument();
  });

  it('shows nothing for someone else', async () => {
    renderNotice(2, assigned);

    await waitFor(() => expect(http.get).toHaveBeenCalled());
    expect(screen.queryByText(/aan de toog/)).not.toBeInTheDocument();
  });

  it('ignores days more than two weeks away', async () => {
    renderNotice(1, [{ date: dayjs().add(20, 'day').startOf('day').toISOString(), playerId: 1 }]);

    await waitFor(() => expect(http.get).toHaveBeenCalled());
    expect(screen.queryByText(/aan de toog/)).not.toBeInTheDocument();
  });
});
