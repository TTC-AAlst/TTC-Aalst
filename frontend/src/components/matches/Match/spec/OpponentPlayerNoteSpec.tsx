import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../utils/test-utils';
import { OpponentPlayerNoteButton } from '../OpponentPlayerNote';
import { IPlayerNote } from '../../../../models/model-interfaces';
import http from '../../../../utils/httpClient';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn(),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

const opponent = { competition: 'Vttl' as const, opponentUniqueIndex: 555, opponentName: 'Jan Tegenstander' };

const existingNote: IPlayerNote = {
  id: 7,
  competition: 'Vttl',
  opponentUniqueIndex: 555,
  opponentName: 'Jan Tegenstander',
  note: 'Zwakke backhand',
  modifiedOn: '2026-01-15T10:00:00',
};

const loggedIn = { user: { playerId: 42 }, playerNotes: { notes: [] as IPlayerNote[], loaded: true } };

describe('OpponentPlayerNoteButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(http, 'get').mockResolvedValue([]);
  });

  it('renders nothing when not logged in', () => {
    const { container } = renderWithProviders(<OpponentPlayerNoteButton {...opponent} />, {
      preloadedState: { user: { playerId: 0 }, playerNotes: { notes: [], loaded: true } },
    });
    expect(container.querySelector('button')).toBeNull();
  });

  it('opens the modal with the existing note', () => {
    renderWithProviders(<OpponentPlayerNoteButton {...opponent} />, {
      preloadedState: { ...loggedIn, playerNotes: { notes: [existingNote], loaded: true } },
    });

    fireEvent.click(screen.getByRole('button', { name: /Jan Tegenstander/ }));

    expect(screen.getByRole('textbox')).toHaveValue('Zwakke backhand');
  });

  it('saves a new note', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue({ ...existingNote, note: 'Speelt links' });
    const { store } = renderWithProviders(<OpponentPlayerNoteButton {...opponent} />, { preloadedState: loggedIn });

    fireEvent.click(screen.getByRole('button', { name: /Jan Tegenstander/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Speelt links' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bewaren' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/playernotes', { ...opponent, note: 'Speelt links' }));
    await waitFor(() => expect(store.getState().playerNotes.notes).toHaveLength(1));
    expect(store.getState().playerNotes.notes[0]?.note).toBe('Speelt links');
  });

  it('removes the note from the store when the backend returns nothing', async () => {
    vi.spyOn(http, 'post').mockResolvedValue(undefined);
    const { store } = renderWithProviders(<OpponentPlayerNoteButton {...opponent} />, {
      preloadedState: { ...loggedIn, playerNotes: { notes: [existingNote], loaded: true } },
    });

    fireEvent.click(screen.getByRole('button', { name: /Jan Tegenstander/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bewaren' }));

    await waitFor(() => expect(store.getState().playerNotes.notes).toHaveLength(0));
  });

  it('deletes the note', async () => {
    const del = vi.spyOn(http, 'delete').mockResolvedValue(undefined);
    const { store } = renderWithProviders(<OpponentPlayerNoteButton {...opponent} />, {
      preloadedState: { ...loggedIn, playerNotes: { notes: [existingNote], loaded: true } },
    });

    fireEvent.click(screen.getByRole('button', { name: /Jan Tegenstander/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));

    await waitFor(() => expect(del).toHaveBeenCalledWith('/playernotes/7'));
    await waitFor(() => expect(store.getState().playerNotes.notes).toHaveLength(0));
  });

  it('fetches the notes of the logged in user once', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue([existingNote]);
    const { store } = renderWithProviders(<OpponentPlayerNoteButton {...opponent} />, {
      preloadedState: { user: { playerId: 42 }, playerNotes: { notes: [], loaded: false } },
    });

    await waitFor(() => expect(store.getState().playerNotes.notes).toHaveLength(1));
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/playernotes');
  });
});
