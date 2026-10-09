import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import dayjs from 'dayjs';
import { renderWithProviders, TestRouter } from '../../../utils/test-utils';
import { Matches } from '../Matches';
import { IMatch } from '../../../models/model-interfaces';
import http from '../../../utils/httpClient';

vi.mock('../../../storeUtil', () => ({ default: {} }));

const homeDay = dayjs().add(3, 'day').hour(20).minute(0);
const awayDay = dayjs().add(5, 'day').hour(20).minute(0);

const createMatch = (id: number, date: dayjs.Dayjs, isHomeMatch: boolean): IMatch =>
  ({
    id,
    date,
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
      getDivisionRanking: () => ({ empty: true, isForfait: false, position: 0 }),
      renderOwnTeamTitle: () => 'Aalst A',
    }),
    renderOpponentTitle: () => 'Opponent B',
    getPlayerFormation: () => [],
    isStandardStartTime: () => true,
  }) as unknown as IMatch;

const matches = [createMatch(1, homeDay, true), createMatch(2, awayDay, false)];

vi.mock('../../../utils/hooks/storeHooks', async importOriginal => {
  const original = await importOriginal<typeof import('../../../utils/hooks/storeHooks')>();
  return { ...original, selectMatches: () => matches };
});

describe('Matches toog', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows who is at the toog next to a home day', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      { date: homeDay.startOf('day').toISOString(), playerId: 1 },
      { date: awayDay.startOf('day').toISOString(), playerId: 1 },
    ]);

    renderWithProviders(
      <TestRouter>
        <Matches />
      </TestRouter>,
      { preloadedState: { players: [{ id: 1, alias: 'Wouter', firstName: 'Wouter', lastName: 'VS' }], user: { playerId: 1 } } },
    );

    expect(await screen.findAllByText('Wouter')).toHaveLength(1);
  });
});
