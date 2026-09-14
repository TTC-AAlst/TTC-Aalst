import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { MatchesTableEditPlayerLineUp } from '../MatchesTableEditPlayerLineUp';
import { IMatch, ITeam, ITeamPlayerInfo } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: (teamId: number) => ({ id: teamId, teamCode: teamId === 1 ? 'A' : 'B' }),
    getPlayer: (playerId: number) => ({ id: playerId, alias: 'Arne', getCompetition: () => ({ position: 1 }) }),
  },
}));

vi.mock('../MatchesTablePlayerLineUpCells', () => ({
  MatchesTablePlayerLineUpDateCell: () => null,
  MatchesTablePlayerLineUpFrenoyMatchIdCell: () => null,
  MatchesTablePlayerLineUpMatchVsCell: () => null,
  MatchesTablePlayerLineUpMatchBlockCell: () => null,
  MatchesTablePlayerLineUpPlayerPlayingCell: () => null,
}));

vi.mock('../../../players/PlayerBadges', () => ({
  PlayerCompetitionButton: ({ conflictTeams }: { conflictTeams?: string[] }) => (
    <span>{`BTN${conflictTeams?.length ? `!${conflictTeams.join(',')}` : ''}`}</span>
  ),
}));

const teamPlayer = (playerId: number, alias: string): ITeamPlayerInfo => ({ player: { id: playerId, alias }, type: 'Captain' }) as unknown as ITeamPlayerInfo;

const team = (): ITeam =>
  ({
    id: 1,
    competition: 'Sporta',
    getPlayers: () => [teamPlayer(7, 'Arne')],
  }) as unknown as ITeam;

const ownMatch = (): IMatch =>
  ({
    id: 5,
    block: 'Captain',
    competition: 'Sporta',
    isSyncedWithFrenoy: false,
    getPlayerFormation: () => [],
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

const renderTable = () =>
  renderWithProviders(
    <TestRouter>
      <MatchesTableEditPlayerLineUp team={team()} matches={[ownMatch()]} tablePlayers={[]} onTablePlayerSelect={() => {}} />
    </TestRouter>,
    {
      preloadedState: {
        matches: [storeMatch(5, 1), storeMatch(6, 2)],
        user: { playerId: 1, teams: [], security: ['CAN_MANAGETEAM'] },
      } as never,
    },
  );

describe('MatchesTableEditPlayerLineUp — dubbele opstelling', () => {
  it('passes the other team to the formation button', () => {
    renderTable();

    expect(screen.getByText('BTN!Sporta B')).toBeInTheDocument();
  });
});
