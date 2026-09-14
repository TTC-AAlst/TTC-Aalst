import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import dayjs, { Dayjs } from 'dayjs';
import { renderWithProviders } from '../../../utils/test-utils';
import PlayerLineup from '../PlayerLineup';
import { IMatch, ITeam, IToogDay } from '../../../models/model-interfaces';
import http from '../../../utils/httpClient';

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

const playerId = 1;
const homeDay = dayjs().add(7, 'day').startOf('day');

const toogDays: IToogDay[] = [{ date: homeDay.toISOString(), homeTeamIds: [10], available: false, assigned: false }];

const createTeam = (matchDates: Dayjs[]): ITeam => {
  const team = {
    id: 10,
    competition: 'Vttl',
    teamCode: 'A',
    getDivisionRanking: () => ({ empty: true }),
    renderOwnTeamTitle: () => 'Vttl A',
    getMatches: (): IMatch[] => matches,
  } as unknown as ITeam;

  const matches = matchDates.map(
    (date, index) =>
      ({
        id: index + 1,
        teamId: 10,
        date,
        frenoyMatchId: `1/${index + 1}`,
        shouldBePlayed: true,
        isSyncedWithFrenoy: false,
        isHomeMatch: true,
        block: '',
        competition: 'Vttl',
        opponent: { clubId: 20, teamCode: 'B' },
        players: [],
        comments: [],
        games: [],
        getTeam: () => team,
        getPlayerFormation: () => [],
        getDisplayDate: () => date.format('ddd D/M HH'),
        renderOpponentTitle: () => 'Opponent B',
      }) as unknown as IMatch,
  );

  return team;
};

describe('PlayerLineup toog column', () => {
  beforeEach(() => {
    vi.spyOn(http, 'get').mockResolvedValue(toogDays);
    vi.spyOn(http, 'post').mockResolvedValue(toogDays.map(x => ({ ...x, available: true })));
  });

  it('shows a toog-only row for a home day without an own match', async () => {
    renderWithProviders(<PlayerLineup teams={[]} playerId={playerId} showToog />, {
      preloadedState: { toog: { mine: toogDays, admin: [] } },
    });

    expect(await screen.findByText('Ik kan toog doen')).toBeInTheDocument();
    expect(screen.getByText('Jouw ploeg speelt niet')).toBeInTheDocument();
  });

  it('posts the date when the toggle is clicked', async () => {
    renderWithProviders(<PlayerLineup teams={[]} playerId={playerId} showToog />, {
      preloadedState: { toog: { mine: toogDays, admin: [] } },
    });

    fireEvent.click(await screen.findByText('Ik kan toog doen'));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/toog/mine', { date: homeDay.toISOString(), available: true }));
  });

  it('locks the toggle and explains who to contact once assigned', async () => {
    const assigned = [{ ...toogDays[0]!, available: true, assigned: true }];
    vi.spyOn(http, 'get').mockResolvedValue(assigned);
    renderWithProviders(<PlayerLineup teams={[]} playerId={playerId} showToog />, {
      preloadedState: { toog: { mine: assigned, admin: [] } },
    });

    expect(await screen.findByText('Neem contact op met het bestuur als je de toog toch niet kan doen')).toBeInTheDocument();
    expect(screen.queryByText('Ik kan toog doen')).not.toBeInTheDocument();
  });

  it('renders one toggle when two own matches fall on the same home day', async () => {
    const team = createTeam([homeDay.hour(20), homeDay.hour(19)]);

    renderWithProviders(<PlayerLineup teams={[team]} playerId={playerId} showToog />, {
      preloadedState: { toog: { mine: toogDays, admin: [] } },
    });

    expect(await screen.findAllByText('Ik kan toog doen')).toHaveLength(1);
  });

  it('does not render the toog column without showToog', () => {
    renderWithProviders(<PlayerLineup teams={[]} playerId={playerId} />, {
      preloadedState: { toog: { mine: toogDays, admin: [] } },
    });

    expect(screen.queryByText('Toog')).not.toBeInTheDocument();
  });
});
