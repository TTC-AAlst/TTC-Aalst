import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { t } from '../../../locales';
import { isValidEmail } from './membershipModels';

const QuillEditor = React.lazy(() => import('../../controls/Editor'));

type MembershipEmailModalProps = {
  to: string;
  cc: string;
  subject: string;
  body: string;
  attachmentNames: string[];
  onSend: (email: { to: string[]; cc: string[]; subject: string; body: string }) => Promise<void>;
  onClose: () => void;
};

const splitEmails = (value: string): string[] =>
  value
    .split(/[,;\s]+/)
    .map(x => x.trim())
    .filter(Boolean);

export const MembershipEmailModal = (props: MembershipEmailModalProps) => {
  const [to, setTo] = useState(props.to);
  const [cc, setCc] = useState(props.cc);
  const [subject, setSubject] = useState(props.subject);
  const [body, setBody] = useState(props.body);
  const [sending, setSending] = useState(false);

  const toList = splitEmails(to);
  const ccList = splitEmails(cc);
  const valid = toList.length > 0 && toList.concat(ccList).every(isValidEmail);

  const send = async () => {
    setSending(true);
    try {
      await props.onSend({ to: toList, cc: ccList, subject, body });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal size="xl" show onHide={props.onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Aansluitingsformulier mailen</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-2" controlId="membership-email-to">
          <Form.Label>Aan</Form.Label>
          <Form.Control value={to} isInvalid={!valid} onChange={e => setTo(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-2" controlId="membership-email-cc">
          <Form.Label>Cc</Form.Label>
          <Form.Control value={cc} onChange={e => setCc(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-2" controlId="membership-email-subject">
          <Form.Label>Onderwerp</Form.Label>
          <Form.Control value={subject} onChange={e => setSubject(e.target.value)} />
        </Form.Group>
        {props.attachmentNames.map(name => (
          <div className="mb-2" key={name}>
            <i className="fa fa-paperclip" /> {name}
          </div>
        ))}
        <div style={{ height: 340 }}>
          <React.Suspense fallback={null}>
            <QuillEditor text={body} style={{ height: 300 }} onChange={setBody} readOnly={false} />
          </React.Suspense>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={props.onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" disabled={!valid || sending} onClick={send}>
          Versturen
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
