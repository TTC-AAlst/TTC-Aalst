import { describe, it, expect } from 'vitest';
import playerNotesReducer, { deletePlayerNote, fetchPlayerNotes, savePlayerNote } from '../playerNotesReducer';
import { logout } from '../userReducer';
import { IPlayerNote } from '../../models/model-interfaces';

const note: IPlayerNote = {
  id: 1,
  competition: 'Vttl',
  opponentUniqueIndex: 555,
  opponentName: 'Jan',
  note: 'Snelle service',
  modifiedOn: null,
};

const stateWith = (notes: IPlayerNote[]) => ({ notes, loaded: true });

describe('playerNotesReducer', () => {
  it('stores the fetched notes', () => {
    const result = playerNotesReducer({ notes: [], loaded: false }, { type: fetchPlayerNotes.fulfilled.type, payload: [note] });
    expect(result).toEqual(stateWith([note]));
  });

  it('keeps the state when the fetch was skipped', () => {
    const state = stateWith([note]);
    expect(playerNotesReducer(state, { type: fetchPlayerNotes.fulfilled.type, payload: null })).toBe(state);
  });

  it('replaces the note of the same opponent', () => {
    const updated = { ...note, note: 'Toch een trage service' };
    const result = playerNotesReducer(stateWith([note]), {
      type: savePlayerNote.fulfilled.type,
      payload: { params: { competition: 'Vttl', opponentUniqueIndex: 555, opponentName: 'Jan', note: updated.note }, saved: updated },
    });
    expect(result.notes).toEqual([updated]);
  });

  it('keeps notes about other opponents', () => {
    const other: IPlayerNote = { ...note, id: 2, opponentUniqueIndex: 666 };
    const result = playerNotesReducer(stateWith([note, other]), {
      type: savePlayerNote.fulfilled.type,
      payload: { params: { competition: 'Vttl', opponentUniqueIndex: 555, opponentName: 'Jan', note: '' }, saved: null },
    });
    expect(result.notes).toEqual([other]);
  });

  it('is per competition', () => {
    const sporta: IPlayerNote = { ...note, id: 3, competition: 'Sporta' };
    const result = playerNotesReducer(stateWith([note, sporta]), {
      type: savePlayerNote.fulfilled.type,
      payload: { params: { competition: 'Sporta', opponentUniqueIndex: 555, opponentName: 'Jan', note: '' }, saved: null },
    });
    expect(result.notes).toEqual([note]);
  });

  it('removes a deleted note', () => {
    const result = playerNotesReducer(stateWith([note]), { type: deletePlayerNote.fulfilled.type, payload: 1 });
    expect(result.notes).toEqual([]);
  });

  it('forgets everything on logout', () => {
    const result = playerNotesReducer(stateWith([note]), logout());
    expect(result).toEqual({ notes: [], loaded: false });
  });
});
