import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { MatchesTablePlayerLineUp } from '../MatchesTablePlayerLineUp';
import { IMatch, IPlayer, ITeam, ITeamPlayerInfo } from '../../../../models/model-interfaces';

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
  MatchesTablePlayerLineUpPlayerPlayingCell: ({ player, conflictTeams }: { player: IPlayer; conflictTeams?: string[] }) => (
    <span>{`PLAY:${player.alias}${conflictTeams?.length ? `!${conflictTeams.join(',')}` : ''}`}</span>
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
    isSyncedWithFrenoy: false,
    getPlayerFormation: () => [{ id: 7, player: { id: 7, alias: 'Arne' }, matchPlayer: { status: 'Captain' } }],
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

const renderMatrix = () =>
  renderWithProviders(
    <TestRouter>
      <MatchesTablePlayerLineUp team={team()} matches={[ownMatch()]} />
    </TestRouter>,
    { preloadedState: { matches: [storeMatch(5, 1), storeMatch(6, 2)] } as never },
  );

describe('MatchesTablePlayerLineUp — dubbele opstelling', () => {
  it('passes the other team to the playing cell', () => {
    renderMatrix();

    expect(screen.getByText('PLAY:Arne!Sporta B')).toBeInTheDocument();
  });
});
