import { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import { Icon } from '../../controls/Icons/Icon';
import { Competition } from '../../../models/model-interfaces';
import { t } from '../../../locales';
import { selectUser, useTtcDispatch, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { deletePlayerNote, fetchPlayerNotes, savePlayerNote, selectPlayerNote } from '../../../reducers/playerNotesReducer';

type OpponentPlayerNoteProps = {
  competition: Competition;
  opponentUniqueIndex: number;
  opponentName: string;
};

export const OpponentPlayerNoteButton = ({ competition, opponentUniqueIndex, opponentName }: OpponentPlayerNoteProps) => {
  const dispatch = useTtcDispatch();
  const user = useTtcSelector(selectUser);
  const note = useTtcSelector(state => selectPlayerNote(state, competition, opponentUniqueIndex));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.playerId) {
      dispatch(fetchPlayerNotes());
    }
  }, [user?.playerId, dispatch]);

  if (!user?.playerId) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant={note ? 'outline-primary' : 'outline-secondary'}
        onClick={() => setOpen(true)}
        title={note ? note.note : t('match.playerNotes.add')}
        aria-label={t('match.playerNotes.buttonLabel', { name: opponentName })}
        style={{ padding: '2px 6px' }}
      >
        <Icon fa={note ? 'fa fa-sticky-note' : 'fa fa-sticky-note-o'} />
      </Button>

      {open && (
        <OpponentPlayerNoteModal
          competition={competition}
          opponentUniqueIndex={opponentUniqueIndex}
          opponentName={opponentName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

const OpponentPlayerNoteModal = ({ competition, opponentUniqueIndex, opponentName, onClose }: OpponentPlayerNoteProps & { onClose: () => void }) => {
  const dispatch = useTtcDispatch();
  const note = useTtcSelector(state => selectPlayerNote(state, competition, opponentUniqueIndex));
  const [text, setText] = useState(note?.note ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await dispatch(savePlayerNote({ competition, opponentUniqueIndex, opponentName, note: text })).unwrap();
      onClose();
    } catch (_err) {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!note) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await dispatch(deletePlayerNote(note.id)).unwrap();
      onClose();
    } catch (_err) {
      setSaving(false);
    }
  };

  return (
    <Modal show onHide={onClose} centered style={{ zIndex: 100000 }}>
      <Modal.Header closeButton>
        <Modal.Title>{t('match.playerNotes.title', { name: opponentName })}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <textarea
          className="form-control"
          rows={6}
          autoFocus
          value={text}
          placeholder={t('match.playerNotes.placeholder')}
          aria-label={t('match.playerNotes.title', { name: opponentName })}
          onChange={e => setText(e.target.value)}
        />
        <small style={{ color: '#666' }}>{t('match.playerNotes.privacy')}</small>
        {note?.modifiedOn && (
          <small style={{ color: '#666', display: 'block' }}>{t('match.playerNotes.lastEdit', { date: dayjs(note.modifiedOn).format('D/M/YYYY') })}</small>
        )}
      </Modal.Body>

      <Modal.Footer>
        {note && (
          <Button variant="outline-danger" disabled={saving} onClick={remove}>
            {t('common.delete')}
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" disabled={saving} onClick={save}>
          {t('common.save')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
