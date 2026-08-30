import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { MobileLiveMatchInProgress } from '../MobileLiveMatchInProgress';
import { IMatch } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn().mockReturnValue({ getCaptainPlayerIds: () => [] }),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn(),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

vi.mock('../../../../utils/httpClient', () => ({
  default: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
  },
}));

const createMockMatch = (overrides: Partial<IMatch> = {}): IMatch =>
  ({
    id: 1,
    competition: 'Vttl',
    frenoyDivisionId: 1,
    frenoyMatchId: 'OVLH01/001',
    games: [],
    players: [],
    comments: [],
    block: 'Major',
    isHomeMatch: true,
    description: '',
    opponent: { clubId: 10, teamCode: 'A' },
    teamId: 1,
    date: { isBefore: () => true, subtract: () => ({ isBefore: () => true }), format: () => '19:00', isSame: () => true } as unknown,
    getTeam: () =>
      ({
        renderOwnTeamTitle: () => 'TTC Aalst A',
        getDivisionRanking: () => ({ empty: true }),
        getThriller: () => null,
      }) as unknown,
    renderOpponentTitle: () => 'Opponent A',
    getOwnPlayers: () => [],
    getTheirPlayers: () => [{ position: 1, name: 'Player 1', ranking: 'C6', uniqueIndex: 100, won: 0, home: false, status: 'Major', alias: 'P1' }],
    getOpponentClub: () => ({ id: 10, name: 'Test Club', codeVttl: 'OB001', codeSporta: '', mainLocation: null }) as unknown,
    isSyncedWithFrenoy: false,
    isStandardStartTime: () => true,
    getTeamPlayerCount: () => 4,
    ...overrides,
  }) as unknown as IMatch;

const renderInProgress = (match: IMatch, userState = {}) =>
  renderWithProviders(
    <TestRouter>
      <MobileLiveMatchInProgress match={match} />
    </TestRouter>,
    { preloadedState: { user: { playerId: 1, teams: [1], security: [], ...userState }, readonlyMatches: [] } },
  );

describe('MatchActionButtons admin button', () => {
  it('does not show admin button for regular users', () => {
    renderInProgress(createMockMatch());

    expect(screen.queryByRole('button', { name: 'admin' })).not.toBeInTheDocument();
  });

  it('shows admin button for dev users', () => {
    renderInProgress(createMockMatch(), { security: ['IS_DEV'] });

    expect(screen.getByRole('button', { name: 'admin' })).toBeInTheDocument();
  });

  it('opens modal with match JSON when admin button is clicked', async () => {
    const user = userEvent.setup();
    renderInProgress(createMockMatch(), { security: ['IS_DEV'] });

    await user.click(screen.getByRole('button', { name: 'admin' }));

    expect(screen.getByText('Nu synchroniseren')).toBeInTheDocument();
  });
});
