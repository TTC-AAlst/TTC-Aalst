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

type TeamStub = { id: number; competition: string; teamCode: string };

const createTeam = (matchDates: Dayjs[], stub: TeamStub = { id: 10, competition: 'Vttl', teamCode: 'A' }): ITeam => {
  const team = {
    ...stub,
    getDivisionRanking: () => ({ empty: true }),
    renderOwnTeamTitle: () => `${stub.competition} ${stub.teamCode}`,
    getMatches: (): IMatch[] => matches,
  } as unknown as ITeam;

  const matches = matchDates.map(
    (date, index) =>
      ({
        id: stub.id * 100 + index + 1,
        teamId: stub.id,
        date,
        frenoyMatchId: `${stub.id}/${index + 1}`,
        shouldBePlayed: true,
        isSyncedWithFrenoy: false,
        isHomeMatch: true,
        block: '',
        competition: stub.competition,
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

  it('names the teams playing at home on a toog-only row', async () => {
    renderWithProviders(<PlayerLineup teams={[]} playerId={playerId} showToog />, {
      preloadedState: {
        toog: { mine: toogDays, admin: [] },
        teams: [{ id: 10, competition: 'Vttl', teamCode: 'A' }],
      },
    });

    expect(await screen.findByText('Vttl A')).toBeInTheDocument();
  });

  it('turns a home day whose match the competition filter hides into a toog-only row', async () => {
    const sportaDay = homeDay.add(2, 'day');
    const days: IToogDay[] = [toogDays[0]!, { date: sportaDay.toISOString(), homeTeamIds: [11], available: false, assigned: false }];
    vi.spyOn(http, 'get').mockResolvedValue(days);
    const vttl = createTeam([homeDay.hour(20)]);
    const sporta = createTeam([sportaDay.hour(20)], { id: 11, competition: 'Sporta', teamCode: 'B' });

    renderWithProviders(<PlayerLineup teams={[vttl, sporta]} playerId={playerId} showToog />, {
      preloadedState: { toog: { mine: days, admin: [] } },
    });

    expect(await screen.findAllByText('Ik kan toog doen')).toHaveLength(2);
    expect(screen.queryByText('Jouw ploeg speelt niet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Sporta'));

    expect(await screen.findAllByText('Ik kan toog doen')).toHaveLength(2);
    expect(screen.getByText('Jouw ploeg speelt niet')).toBeInTheDocument();
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
