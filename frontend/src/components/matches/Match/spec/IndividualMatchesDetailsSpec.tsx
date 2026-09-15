import { vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { IndividualMatches } from '../IndividualMatches';
import MatchModel from '../../../../models/MatchModel';
import { IFullStoreMatchOwn, IMatch, IMatchPlayer } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getPlayer: vi.fn(),
    getTeam: vi.fn().mockReturnValue({
      id: 493,
      teamCode: 'A',
      competition: 'Vttl',
      frenoy: { getWeekUrl: (week: number) => `https://competitie.vttl.be/?week_name=0${week}` },
    }),
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

const match = (scores?: string): IMatch =>
  new MatchModel({
    id: 1,
    competition: 'Vttl',
    teamId: 493,
    week: 8,
    frenoyMatchId: 'POVLH16/008',
    isHomeMatch: true,
    opponent: { clubId: 2, teamCode: 'B' },
    comments: [],
    players: [player(10, 'Jorn', true), player(20, 'Maarten', false)],
    games: [
      {
        id: 1,
        matchId: 1,
        matchNumber: 1,
        homePlayerUniqueIndex: 10,
        outPlayerUniqueIndex: 20,
        homePlayerSets: 3,
        outPlayerSets: 1,
        outcome: 'Won',
        scores,
      },
    ],
  } as unknown as IFullStoreMatchOwn) as unknown as IMatch;

const renderMatch = (scores?: string) =>
  renderWithProviders(
    <TestRouter>
      <IndividualMatches match={match(scores)} ownPlayerId={0} />
    </TestRouter>,
  );

describe('IndividualMatches set score details', () => {
  it('hides the set scores until they are asked for', () => {
    const { container } = renderMatch('1|-9,2|8,3|5,4|13');
    expect(container.querySelectorAll('.set-score')).toHaveLength(0);
  });

  it('shows the set scores after clicking Details', () => {
    const { container, getByText } = renderMatch('1|-9,2|8,3|5,4|13');

    fireEvent.click(getByText('Details'));

    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['9-11', '11-8', '11-5', '15-13']);
  });

  it('hides the set scores again on a second click', () => {
    const { container, getByText } = renderMatch('1|-9,2|8,3|5,4|13');

    fireEvent.click(getByText('Details'));
    fireEvent.click(getByText('Details'));

    expect(container.querySelectorAll('.set-score')).toHaveLength(0);
  });

  it('offers no Details for a competition without set scores', () => {
    const { queryByText } = renderMatch(undefined);
    expect(queryByText('Details')).toBeNull();
  });

  it('links the Frenoy match id to the match on Frenoy', () => {
    const { container } = renderMatch('1|-9,2|8,3|5,4|13');
    const link = container.querySelector('thead a')!;
    expect(link).not.toBeNull();
    expect(link.textContent).toContain('POVLH16/008');
    expect(link.getAttribute('href')).toContain('week_name=08');
  });
});
