import { describe, it, expect, vi } from 'vitest';
import dayjs from 'dayjs';
import { getToogDays, getToogPerPlayer } from '../htmlBuilder';
import { IMatch } from '../../../../models/model-interfaces';
import { RootState } from '../../../../store';

vi.mock('../../../../storeUtil', () => ({ default: {}, getOpponentFormations: vi.fn() }));

const saturday = dayjs('2026-10-10T19:00:00');
const sunday = dayjs('2026-10-11T10:00:00');

const match = (date: dayjs.Dayjs, isHomeMatch = true) => ({ date, isHomeMatch }) as IMatch;

const state = {
  players: [
    { id: 1, alias: 'Wouter' },
    { id: 2, alias: 'Jorn' },
  ],
  toog: {
    assigned: [
      { date: '2026-10-10T00:00:00', playerId: 1 },
      { date: '2026-10-11T00:00:00', playerId: 1 },
      { date: '2026-10-12T00:00:00', playerId: 2 },
    ],
  },
} as unknown as RootState;

describe('htmlBuilder toog', () => {
  it('lists each home day once with its toog player', () => {
    const days = getToogDays(state, [match(saturday), match(saturday.hour(20)), match(dayjs('2026-10-12T20:00:00'), false)]);

    expect(days.map(d => [d.day, d.player.alias])).toEqual([[saturday.format('ddd D/M'), 'Wouter']]);
  });

  it('joins the days of a player at the toog more than once', () => {
    const days = getToogDays(state, [match(sunday), match(saturday)]);

    expect(getToogPerPlayer(days)).toEqual({ 1: `${saturday.format('ddd D/M')} en ${sunday.format('ddd D/M')}` });
  });
});
