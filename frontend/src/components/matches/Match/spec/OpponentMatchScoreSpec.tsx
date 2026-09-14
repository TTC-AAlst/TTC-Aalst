import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { IFullStoreMatchOwn, IStoreMatchCommon } from '../../../../models/model-interfaces';
import { OwnClubId } from '../../../../models/ClubModel';

const TeamAId = 493;
const TeamBId = 494;

const storedDerby = (): IFullStoreMatchOwn =>
  ({
    id: 77,
    teamId: TeamAId,
    opponentTeamId: TeamBId,
    isHomeMatch: true,
    shouldBePlayed: true,
    isSyncedWithFrenoy: true,
    opponent: { clubId: OwnClubId, teamCode: 'B' },
    score: { home: 10, out: 0 },
    scoreType: 'Won',
    comments: [],
    description: '',
    players: [],
    games: [],
  }) as unknown as IFullStoreMatchOwn;

const state = {
  matches: [storedDerby()],
  teams: [
    { id: TeamAId, teamCode: 'A', competition: 'Sporta' },
    { id: TeamBId, teamCode: 'B', competition: 'Sporta' },
  ],
  teamRankings: {},
};

vi.mock('../../../../store', () => ({ store: { getState: () => state } }));

const MatchModel = (await import('../../../../models/MatchModel')).default;
const { OpponentMatchScore } = await import('../OpponentMatchScore');

const readonlyDerby = () =>
  new MatchModel({
    ...(storedDerby() as unknown as IStoreMatchCommon),
    opponent: undefined,
    home: { clubId: OwnClubId, teamCode: 'A' },
    away: { clubId: OwnClubId, teamCode: 'B' },
  } as unknown as IStoreMatchCommon);

const renderFor = (ownTeamId: number) =>
  renderWithProviders(
    <TestRouter>
      <OpponentMatchScore readonlyMatch={readonlyDerby()} ownTeamId={ownTeamId} />
    </TestRouter>,
  );

describe('OpponentMatchScore — derby', () => {
  it('shows the derby as won for the winning own team', () => {
    renderFor(TeamAId);
    expect(screen.getByText('10 - 0').closest('.label-as-badge')!.classList.contains('match-won')).toBe(true);
  });

  it('shows the same derby as lost for the losing own team', () => {
    renderFor(TeamBId);
    expect(screen.getByText('10 - 0').closest('.label-as-badge')!.classList.contains('match-lost')).toBe(true);
  });
});
