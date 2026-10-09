import { MobileLiveMatches } from './MobileLiveMatches/MobileLiveMatches';
import { ToogLines } from '../toog/ToogAssignments';
import { selectMatchesBeingPlayed, useTtcSelector } from '../../utils/hooks/storeHooks';

export const MatchesToday = () => {
  const matchesToday = useTtcSelector(selectMatchesBeingPlayed);
  if (matchesToday.length === 0) {
    return <div />;
  }

  const homeDays = matchesToday.filter(m => m.isHomeMatch).map(m => m.date);
  return (
    <>
      <MobileLiveMatches matches={matchesToday} />
      <ToogLines days={homeDays} showDate={false} />
    </>
  );
};
