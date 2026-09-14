import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { MobileLiveMatchInProgress } from '../MobileLiveMatchInProgress';
import { IMatch, IMatchGame, IMatchPlayer, IMatchPlayerInfo } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: (teamId: number) => ({ id: teamId, teamCode: teamId === 1 ? 'A' : 'B', getCaptainPlayerIds: () => [] }),
    getPlayer: (playerId: number) => ({ id: playerId, alias: 'Arne', getCompetition: () => ({ position: 1 }) }),
  },
}));

vi.mock('../../../../utils/httpClient', () => ({
  default: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../../players/PlayerBadges', () => ({
  PlayerCompetitionBadge: ({ plyInfo, conflictTeams }: { plyInfo: IMatchPlayerInfo; conflictTeams?: string[] }) => (
    <span>{`FORM:${plyInfo.player.alias}${conflictTeams?.length ? `!${conflictTeams.join(',')}` : ''}`}</span>
  ),
}));

const mockTeam = {
  renderOwnTeamTitle: () => 'TTC Aalst A',
  getDivisionRanking: () => ({ empty: true }),
  getThriller: () => null,
  getMatches: () => [],
};

// The prop match: what OurFormationPreStart renders. Independent of the raw
// store matches below, which feed selectLineupConflicts.
const ownMatch = (): IMatch =>
  ({
    id: 5,
    competition: 'Sporta',
    frenoyDivisionId: 1,
    games: [] as IMatchGame[],
    comments: [],
    block: '',
    isHomeMatch: true,
    description: '',
    opponent: { clubId: 10, teamCode: 'X' },
    teamId: 1,
    date: { isBefore: () => true, subtract: () => ({ isBefore: () => true }), format: () => '19:00', isSame: () => true },
    getTeam: () => mockTeam,
    renderOpponentTitle: () => 'Opponent X',
    getOwnPlayers: () => [] as IMatchPlayer[],
    getTheirPlayers: () => [] as IMatchPlayer[],
    getOpponentClub: () => ({ id: 10, name: 'Test Club', codeVttl: 'OB001', codeSporta: '', mainLocation: null }),
    isSyncedWithFrenoy: false,
    isStandardStartTime: () => true,
    getTeamPlayerCount: () => 4 as 3 | 4,
    getPlayerFormation: () => [{ id: 7, player: { id: 7, alias: 'Arne' }, matchPlayer: { status: 'Major' } }] as unknown as IMatchPlayerInfo[],
  }) as unknown as IMatch;

// Two Sporta matches in week 3 that both pick player 7
const storeMatch = (id: number, teamId: number) => ({
  id,
  week: 3,
  competition: 'Sporta',
  block: 'Captain',
  shouldBePlayed: true,
  isSyncedWithFrenoy: false,
  date: '2026-09-15T20:00:00',
  teamId,
  opponentTeamId: null,
  isHomeMatch: true,
  opponent: { clubId: 999, teamCode: 'X' },
  score: { home: 0, out: 0 },
  scoreType: 'NotYetPlayed',
  players: [{ playerId: 7, home: true, status: 'Captain', position: 1 }],
  games: [],
  comments: [],
});

const renderMatch = () =>
  renderWithProviders(
    <TestRouter>
      <MobileLiveMatchInProgress match={ownMatch()} />
    </TestRouter>,
    { preloadedState: { user: { playerId: 1, teams: [1], security: [] }, readonlyMatches: [], matches: [storeMatch(5, 1), storeMatch(6, 2)] } as never },
  );

describe('OurFormationPreStart — dubbele opstelling', () => {
  it('flags a player also lined up for another team that week', () => {
    renderMatch();

    expect(screen.getByText('FORM:Arne!Sporta B')).toBeInTheDocument();
  });
});
