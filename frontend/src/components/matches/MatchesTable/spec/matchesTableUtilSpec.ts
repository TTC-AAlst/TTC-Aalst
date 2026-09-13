import { IMatch, ITeamPlayerInfo } from '../../../../models/model-interfaces';
import { toUndecidedPlayer } from '../matchesTableUtil';

const match = { id: 7, competition: 'Vttl' } as unknown as IMatch;
const teamPlayer = { player: { id: 3, alias: 'Wouter' } } as unknown as ITeamPlayerInfo;

describe('toUndecidedPlayer', () => {
  it('has no status so it renders apart from an explicit DontKnow', () => {
    expect(toUndecidedPlayer(match, teamPlayer).matchPlayer.status).toBe('');
  });

  it('is tied to the match and the player', () => {
    const undecided = toUndecidedPlayer(match, teamPlayer);
    expect(undecided.matchId).toBe(7);
    expect(undecided.id).toBe(3);
    expect(undecided.player).toBe(teamPlayer.player);
  });
});
