import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { ReadOnlyMatchPlayers } from '../MatchesTableCells';
import { IMatch, IMatchPlayer, IMatchPlayerInfo } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: (teamId: number) => ({ id: teamId, teamCode: teamId === 1 ? 'A' : 'B' }),
    getPlayer: (playerId: number) => ({ id: playerId, alias: 'Arne', getCompetition: () => ({ position: 1 }) }),
  },
}));
// Tag which branch rendered: OwnPlayer = the "all played players" branch, badge = the formation branch.
vi.mock('../../Match/OwnPlayer', () => ({ default: ({ ply }: { ply: IMatchPlayer }) => <span>OWN:{ply.alias}</span> }));
vi.mock('../../../players/PlayerBadges', () => ({
  PlayerCompetitionBadge: ({ plyInfo, conflictTeams }: { plyInfo: IMatchPlayerInfo; conflictTeams?: string[] }) => (
    <span>{`FORM:${plyInfo.player.alias}${conflictTeams?.length ? `!${conflictTeams.join(',')}` : ''}`}</span>
  ),
}));
vi.mock('../../Match/MatchBlock', () => ({ MatchBlock: () => null }));

const bench = (alias: string, i: number): IMatchPlayer => ({ playerId: i, alias, status: 'Play', home: true, position: i }) as unknown as IMatchPlayer;
const major = (alias: string, i: number): IMatchPlayerInfo =>
  ({ id: i, player: { id: i, alias } as unknown, matchPlayer: { status: 'Major' } }) as unknown as IMatchPlayerInfo;

// A synced WALKOVER: getOwnPlayers still holds every pre-match selection (no game cleanup),
// while getPlayerFormation('onlyFinal') is the real 4-man lineup (status === Major).
const woMatch = (): IMatch =>
  ({
    isSyncedWithFrenoy: true,
    scoreType: 'WalkOver',
    block: 'Major',
    getOwnPlayers: () => [bench('Bench1', 1), bench('Bench2', 2), bench('Bench3', 3)],
    getPlayerFormation: (f: string) => (f === 'onlyFinal' ? [major('Major1', 11), major('Major2', 12)] : []),
  }) as unknown as IMatch;

describe('ReadOnlyMatchPlayers — walkover', () => {
  it('shows only the blocked formation, not every selected player', () => {
    renderWithProviders(
      <TestRouter>
        <ReadOnlyMatchPlayers match={woMatch()} displayNonBlocked={false} />
      </TestRouter>,
    );
    expect(screen.getByText('FORM:Major1')).toBeInTheDocument();
    expect(screen.getByText('FORM:Major2')).toBeInTheDocument();
    expect(screen.queryByText('OWN:Bench1')).not.toBeInTheDocument();
  });
});

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

const conflictMatch = (): IMatch =>
  ({
    id: 5,
    isSyncedWithFrenoy: false,
    scoreType: 'NotYetPlayed',
    block: 'Captain',
    competition: 'Sporta',
    getOwnPlayers: () => [],
    getPlayerFormation: () => [major('Arne', 7)],
  }) as unknown as IMatch;

describe('ReadOnlyMatchPlayers — dubbele opstelling', () => {
  it('passes the other team to the badge', () => {
    renderWithProviders(
      <TestRouter>
        <ReadOnlyMatchPlayers match={conflictMatch()} displayNonBlocked={false} />
      </TestRouter>,
      { preloadedState: { matches: [storeMatch(5, 1), storeMatch(6, 2)] } as never },
    );
    expect(screen.getByText('FORM:Arne!Sporta B')).toBeInTheDocument();
  });

  it('leaves a player picked once without a conflict', () => {
    renderWithProviders(
      <TestRouter>
        <ReadOnlyMatchPlayers match={conflictMatch()} displayNonBlocked={false} />
      </TestRouter>,
      { preloadedState: { matches: [storeMatch(5, 1)] } as never },
    );
    expect(screen.getByText('FORM:Arne')).toBeInTheDocument();
  });
});
