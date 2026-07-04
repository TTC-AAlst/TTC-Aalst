import { preservePredictions } from '../preservePredictions';
import { IStorePlayer } from '../../models/model-interfaces';

const player = (id: number, predictions: { vttl?: string | null; sporta?: string | null }): IStorePlayer =>
  ({
    id,
    vttl: 'vttl' in predictions ? ({ prediction: predictions.vttl ?? null } as IStorePlayer['vttl']) : undefined,
    sporta: 'sporta' in predictions ? ({ prediction: predictions.sporta ?? null } as IStorePlayer['sporta']) : undefined,
  }) as IStorePlayer;

describe('preservePredictions', () => {
  it('copies an existing vttl prediction onto a re-fetched (bare) player', () => {
    const state = [player(1, { vttl: 'B2' })];
    const incoming = [player(1, { vttl: null })];

    preservePredictions(state, incoming);

    expect(incoming[0]!.vttl!.prediction).toBe('B2');
  });

  it('copies an existing sporta prediction onto a re-fetched player', () => {
    const state = [player(7, { sporta: 'C0' })];
    const incoming = player(7, { sporta: null });

    preservePredictions(state, incoming);

    expect(incoming.sporta!.prediction).toBe('C0');
  });

  it('leaves a player not present in state untouched', () => {
    const state = [player(1, { vttl: 'B2' })];
    const incoming = [player(2, { vttl: null })];

    preservePredictions(state, incoming);

    expect(incoming[0]!.vttl!.prediction).toBeNull();
  });

  it('does nothing when the existing player has no prediction', () => {
    const state = [player(1, { vttl: null })];
    const incoming = [player(1, { vttl: null })];

    preservePredictions(state, incoming);

    expect(incoming[0]!.vttl!.prediction).toBeNull();
  });

  it('does not crash when the incoming player dropped a competition', () => {
    const state = [player(1, { vttl: 'B2' })];
    const incoming = [player(1, {})]; // no vttl/sporta on the refetched player

    expect(() => preservePredictions(state, incoming)).not.toThrow();
    expect(incoming[0]!.vttl).toBeUndefined();
  });
});
