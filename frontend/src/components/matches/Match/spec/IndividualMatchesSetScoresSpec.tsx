import { vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { ReadonlyIndividualMatches } from '../IndividualMatches';
import MatchModel from '../../../../models/MatchModel';
import { IFullStoreMatchOwn, IMatch, IMatchPlayer } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getPlayer: vi.fn(),
    getTeam: vi.fn(),
    getClub: vi.fn().mockReturnValue({ id: 2, name: 'Other', codeVttl: '', codeSporta: '' }),
  },
}));

const player = (uniqueIndex: number, name: string, home: boolean): IMatchPlayer =>
  ({
    id: uniqueIndex,
    matchId: 1,
    playerId: 0,
    uniqueIndex,
    name,
    alias: name,
    ranking: 'C4',
    home,
    position: 1,
    won: 0,
    status: 'Major',
  }) as unknown as IMatchPlayer;

const game = (matchNumber: number, homePlayerSets: number, outPlayerSets: number, scores?: string) => ({
  id: matchNumber,
  matchId: 1,
  matchNumber,
  homePlayerUniqueIndex: 10,
  outPlayerUniqueIndex: 20,
  homePlayerSets,
  outPlayerSets,
  outcome: homePlayerSets > outPlayerSets ? 'Won' : 'Lost',
  scores,
});

const match = (games: ReturnType<typeof game>[]): IMatch =>
  new MatchModel({
    id: 1,
    competition: 'Vttl',
    teamId: 493,
    isHomeMatch: true,
    opponent: { clubId: 2, teamCode: 'B' },
    comments: [],
    players: [player(10, 'Jorn', true), player(20, 'Maarten', false)],
    games,
  } as unknown as IFullStoreMatchOwn) as unknown as IMatch;

const renderMatch = (games: ReturnType<typeof game>[]) =>
  renderWithProviders(
    <TestRouter>
      <ReadonlyIndividualMatches match={match(games)} />
    </TestRouter>,
  );

describe('ReadonlyIndividualMatches set scores', () => {
  it('shows a chip per set of the game', () => {
    const { container } = renderMatch([game(1, 3, 1, '1|-9,2|8,3|5,4|13')]);

    fireEvent.click(container.querySelector<HTMLButtonElement>('button.set-scores-toggle')!);

    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['9-11', '11-8', '11-5', '15-13']);
  });

  it('puts the set count, the running score and the sets in one cell spanning both columns', () => {
    const { container } = renderMatch([game(1, 3, 1, '1|-9,2|8,3|5,4|13')]);

    fireEvent.click(container.querySelector<HTMLButtonElement>('button.set-scores-toggle')!);

    const cell = container.querySelector('tbody td[colspan="2"]')!;
    expect(cell).not.toBeNull();
    expect(cell.textContent).toContain('3-1');
    expect(cell.textContent).toContain('1-0');
    expect(cell.querySelectorAll('.set-score')).toHaveLength(4);
  });

  it('leaves a Sporta game without set scores alone', () => {
    const { container } = renderMatch([game(1, 3, 1)]);
    expect(container.querySelectorAll('.set-score')).toHaveLength(0);
    expect(container.querySelector('tbody td[colspan="2"]')!.textContent).toContain('3-1');
  });
});
