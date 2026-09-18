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

const match = (games: ReturnType<typeof game>[], isHomeMatch = true): IMatch =>
  new MatchModel({
    id: 1,
    competition: 'Vttl',
    teamId: 493,
    isHomeMatch,
    opponent: { clubId: 2, teamCode: 'B' },
    comments: [],
    players: [player(10, 'Jorn', true), player(20, 'Maarten', false)],
    games,
  } as unknown as IFullStoreMatchOwn) as unknown as IMatch;

const renderMatch = (games: ReturnType<typeof game>[], isHomeMatch = true) =>
  renderWithProviders(
    <TestRouter>
      <ReadonlyIndividualMatches match={match(games, isHomeMatch)} />
    </TestRouter>,
  );

const showSets = (container: HTMLElement) => fireEvent.click(container.querySelector<HTMLButtonElement>('button.set-scores-toggle')!);

describe('ReadonlyIndividualMatches set scores', () => {
  beforeEach(() => {
    window.innerWidth = 1024;
  });

  it('shows a chip per set of the game', () => {
    const { container } = renderMatch([game(1, 3, 1, '1|-9,2|8,3|5,4|13')]);

    showSets(container);

    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['9-11', '11-8', '11-5', '15-13']);
  });

  it('puts the set count, the running score and the sets in one cell spanning both columns', () => {
    const { container } = renderMatch([game(1, 3, 1, '1|-9,2|8,3|5,4|13')]);

    showSets(container);

    const cell = container.querySelector('tbody td[colspan="2"]')!;
    expect(cell).not.toBeNull();
    expect(cell.textContent).toContain('3-1');
    expect(cell.textContent).toContain('1-0');
    expect(cell.querySelectorAll('.set-score')).toHaveLength(4);
  });

  it('colors the sets Aalst won green when playing at home', () => {
    const { container } = renderMatch([game(1, 3, 1, '1|-9,2|8,3|5,4|13')]);

    showSets(container);

    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.className.includes('set-score-won'))).toEqual([false, true, true, true]);
  });

  it('colors the sets Aalst won green when playing away', () => {
    const { container } = renderMatch([game(1, 3, 1, '1|-9,2|8,3|5,4|13')], false);

    showSets(container);

    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['9-11', '11-8', '11-5', '15-13']);
    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.className.includes('set-score-won'))).toEqual([true, false, false, false]);
  });

  it('gives the sets a full width row of their own on a phone, so five of them fit on one line', () => {
    window.innerWidth = 400;
    const { container } = renderMatch([game(1, 3, 2, '1|-9,2|8,3|5,4|-7,5|13')]);

    showSets(container);

    const scoreCell = container.querySelector('tbody td[colspan="2"]')!;
    expect(scoreCell.querySelectorAll('.set-score')).toHaveLength(0);

    const setsCell = container.querySelector('tbody td[colspan="4"]')!;
    expect(Array.from(setsCell.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['9-11', '11-8', '11-5', '7-11', '15-13']);
    expect(scoreCell.closest('tr')!.className).toContain('set-scores-joined');
  });

  it('stripes a game and its set scores row as one on a phone', () => {
    window.innerWidth = 400;
    const { container } = renderMatch([game(1, 3, 2, '1|-9,2|8,3|5,4|-7,5|13'), game(2, 1, 3, '1|-9,2|-8,3|5,4|-7')]);

    showSets(container);

    expect(container.querySelector('table')!.className).not.toContain('table-striped');
    const striped = Array.from(container.querySelectorAll('tbody tr')).map(x => x.className.includes('set-scores-stripe'));
    expect(striped).toEqual([true, true, false, false]);
  });

  it('leaves a Sporta game without set scores alone', () => {
    const { container } = renderMatch([game(1, 3, 1)]);
    expect(container.querySelectorAll('.set-score')).toHaveLength(0);
    expect(container.querySelector('tbody td[colspan="2"]')!.textContent).toContain('3-1');
  });
});
