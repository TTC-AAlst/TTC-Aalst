import { IStorePlayer } from '../models/model-interfaces';

const COMPETITIONS = ['vttl', 'sporta'] as const;

/**
 * The /players payload carries no AI `prediction` — it's layered on separately by
 * fetchRankingPredictions. A bare re-fetch (e.g. the SignalR reconnect sync) replaces the
 * stored player wholesale, so without this the prediction is silently wiped and the
 * "Oiljst AI" dashboard block vanishes. Carry any existing prediction onto the incoming
 * players before they replace the stored ones.
 */
export function preservePredictions(state: IStorePlayer[], incoming: IStorePlayer | IStorePlayer[]): void {
  if (!incoming) {
    return;
  }
  const players = Array.isArray(incoming) ? incoming : [incoming];
  players.forEach(player => {
    const existing = state.find(p => p.id === player.id);
    if (!existing) {
      return;
    }
    COMPETITIONS.forEach(comp => {
      const prediction = existing[comp]?.prediction;
      const incomingComp = player[comp];
      if (prediction && incomingComp) {
        incomingComp.prediction = prediction;
      }
    });
  });
}
