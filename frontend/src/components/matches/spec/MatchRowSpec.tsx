import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import dayjs from 'dayjs';
import { renderWithProviders, TestRouter } from '../../../utils/test-utils';
import { MatchRow } from '../Matches';
import { IMatch } from '../../../models/model-interfaces';

vi.mock('../../../storeUtil', () => ({ default: {} }));

const emptyRanking = { empty: true, isForfait: false, position: 0 };

const createMatch = (isHomeMatch: boolean): IMatch =>
  ({
    id: 1,
    date: dayjs('2026-09-19T20:00:00'),
    competition: 'Vttl',
    isHomeMatch,
    score: { home: 0, out: 0 },
    scoreType: 'NotYetPlayed',
    block: null,
    opponent: { clubId: 2, teamCode: 'B' },
    getTeam: () => ({
      competition: 'Vttl',
      teamCode: 'A',
      getThriller: () => null,
      getDivisionRanking: () => emptyRanking,
      renderOwnTeamTitle: () => 'Aalst A',
    }),
    renderOpponentTitle: () => 'Opponent B',
    getPlayerFormation: () => [],
    isStandardStartTime: () => true,
  }) as unknown as IMatch;

const render = (match: IMatch) =>
  renderWithProviders(
    <TestRouter>
      <MatchRow match={match} />
    </TestRouter>,
  );

const teamOrder = () =>
  screen
    .getAllByRole('link')
    .map(el => el.textContent)
    .filter(text => text === 'Aalst A' || text === 'Opponent B');

describe('MatchRow team order', () => {
  it('shows our team first for a home match', () => {
    render(createMatch(true));
    expect(teamOrder()).toEqual(['Aalst A', 'Opponent B']);
  });

  it('shows the opponent first for an away match', () => {
    render(createMatch(false));
    expect(teamOrder()).toEqual(['Opponent B', 'Aalst A']);
  });
});
