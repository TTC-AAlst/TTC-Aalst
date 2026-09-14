import { IMatch, IMatchPlayerInfo } from '../model-interfaces';
import { getPlayerFormation } from './getPlayerFormation';

/** Key into the map returned by findLineupConflicts */
export const conflictKey = (matchId: number, playerId: number): string => `${matchId}-${playerId}`;

type Booking = {
  match: IMatch;
  playerId: number;
};

// A synced match no longer has a block: frenoy marks whoever played as Major
const formationOf = (match: IMatch): IMatchPlayerInfo[] => (match.isSyncedWithFrenoy ? match.getPlayerFormation('onlyFinal') : getPlayerFormation(match));

const teamLabel = (match: IMatch): string => `${match.competition} ${match.getTeam().teamCode}`;

/**
 * A player may be lined up only once per competition per playing week.
 *
 * @returns conflictKey(matchId, playerId) -> the other teams he is lined up for that week.
 *          A synced match gets no entry of its own: it cannot be changed anymore.
 */
export function findLineupConflicts(matches: IMatch[]): Map<string, string[]> {
  const perWeek = new Map<string, Booking[]>();
  matches
    .filter(match => match.shouldBePlayed)
    .forEach(match => {
      const weekKey = `${match.competition}-${match.week}`;
      const bookings = perWeek.get(weekKey) ?? [];
      formationOf(match).forEach(plyInfo => bookings.push({ match, playerId: plyInfo.id }));
      perWeek.set(weekKey, bookings);
    });

  const conflicts = new Map<string, string[]>();
  perWeek.forEach(bookings => {
    bookings.forEach(booking => {
      if (booking.match.isSyncedWithFrenoy) {
        return;
      }
      const elsewhere = bookings.filter(other => other.playerId === booking.playerId && other.match.id !== booking.match.id);
      if (elsewhere.length) {
        conflicts.set(
          conflictKey(booking.match.id, booking.playerId),
          elsewhere.map(other => teamLabel(other.match)),
        );
      }
    });
  });
  return conflicts;
}
