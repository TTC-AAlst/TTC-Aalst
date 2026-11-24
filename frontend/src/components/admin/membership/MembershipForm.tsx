import { ReactNode, useState } from 'react';
import dayjs from 'dayjs';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import { IStorePlayer } from '../../../models/model-interfaces';
import { OwnClubId } from '../../../models/ClubModel';
import { t } from '../../../locales';
import { useTtcDispatch, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { updatePlayer } from '../../../reducers/playersReducer';
import { showSnackbar } from '../../../reducers/configReducer';
import {
  IPlayerMembership,
  MembershipFormType,
  formatAddress,
  formatCity,
  competitionText,
  isMinor,
  isRecreant,
  isValidEmail,
  membershipForms,
  membershipStatuses,
  withContactAddress,
} from './membershipModels';
import { IMembershipPdfData, createMembershipPdf, downloadPdf, getPdfFileName, toBase64 } from './membershipPdf';
import { saveMembership, sendMembershipEmail } from './membershipApi';
import { buildMembershipEmail } from './membershipEmail';
import { MembershipEmailModal } from './MembershipEmailModal';
import { useSeason } from './AdminNewMember';

export interface IMembershipFormState {
  player: IStorePlayer;
  membership: IPlayerMembership;
  formType: MembershipFormType;
  vttlUniqueIndex: number | null;
}

type MembershipFormProps = {
  initial: IMembershipFormState;
  onEnd: () => void;
};

const useBoardMember = (...functions: string[]): string => {
  const club = useTtcSelector(state => state.clubs.find(c => c.id === OwnClubId));
  const players = useTtcSelector(state => state.players);
  const manager = club?.managers.find(m => functions.includes(m.description.toLowerCase()));
  const player = manager && players.find(p => p.id === manager.playerId);
  return player ? `${player.firstName} ${player.lastName}` : '';
};

type FieldProps = {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  width?: number;
  type?: string;
  invalid?: boolean;
};

const Field = ({ label, value, onChange, width = 250, type = 'text', invalid }: FieldProps) => (
  <Form.Group controlId={`membership-${label}`} style={{ width, display: 'inline-block', marginRight: 20, marginBottom: 10, verticalAlign: 'top' }}>
    <Form.Label>{label}</Form.Label>
    <Form.Control type={type} value={value ?? ''} isInvalid={invalid} onChange={e => onChange(e.target.value)} />
  </Form.Group>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card style={{ marginTop: 15, padding: 10 }}>
    <Card.Body>
      <h4>{title}</h4>
      {children}
    </Card.Body>
  </Card>
);

export const MembershipForm = ({ initial, onEnd }: MembershipFormProps) => {
  const dispatch = useTtcDispatch();
  const params = useTtcSelector(state => state.config.params);
  const clubName = useTtcSelector(state => state.clubs.find(c => c.id === OwnClubId)?.name ?? 'TTC Aalst');
  const user = useTtcSelector(state => state.players.find(p => p.id === state.user.playerId));
  const { seasonYear } = useSeason();

  const [player, setPlayer] = useState(initial.player);
  const [membership, setMembership] = useState(withContactAddress(initial.membership, initial.player.contact.address, initial.player.contact.city));
  const [formType, setFormType] = useState(initial.formType);
  const [vttlUniqueIndex, setVttlUniqueIndex] = useState(initial.vttlUniqueIndex);
  const [chairman, setChairman] = useState(useBoardMember('chairman', 'voorzitter'));
  const [secretary, setSecretary] = useState(useBoardMember('secretary', 'secretaris'));
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [emailOpen, setEmailOpen] = useState(false);

  const setM = (changes: Partial<IPlayerMembership>) => setMembership({ ...membership, ...changes });
  const setContact = (changes: Partial<IStorePlayer['contact']>) => setPlayer({ ...player, contact: { ...player.contact, ...changes } });

  const statuses = membershipStatuses.filter(s => s.forms.includes(formType));
  const minor = isMinor(membership.birthDate);
  const emailInvalid = !!player.contact.email && !isValidEmail(player.contact.email);
  const canSave = !!player.firstName.trim() && !!player.lastName.trim() && !emailInvalid;

  const vttlPdfData = (): IMembershipPdfData => ({
    formType,
    firstName: player.firstName,
    lastName: player.lastName,
    email: player.contact.email,
    mobile: player.contact.mobile,
    vttlUniqueIndex,
    membership,
    clubName,
    clubNr: params.frenoyClubIdVttl,
    chairman,
    secretary,
    date: dayjs(date).format('DD/MM/YYYY'),
    seasonYear,
  });

  const save = async () => {
    const wasQuitter = !!player.quitYear;
    const toSave: IStorePlayer = {
      ...player,
      alias: player.alias.trim() || player.firstName.trim(),
      quitYear: null,
      active: true,
      contact: { ...player.contact, address: formatAddress(membership) || player.contact.address, city: formatCity(membership) || player.contact.city },
    };
    const result = await dispatch(updatePlayer({ player: toSave, switchActive: wasQuitter })).unwrap();
    if (!result?.player) {
      return;
    }
    const saved = await saveMembership({ ...membership, playerId: result.player.id });
    setPlayer(result.player);
    setMembership(saved);
  };

  /** One filled form per federation. Sporta forms are not available yet. */
  const documents = (): { federation: string; data: IMembershipPdfData }[] => (membership.vttl ? [{ federation: 'VTTL', data: vttlPdfData() }] : []);

  const download = async () => {
    for (const doc of documents()) {
      downloadPdf(await createMembershipPdf(doc.data), getPdfFileName(doc.data));
    }
  };

  const recipients = [player.contact.email, minor ? membership.parentEmail1 : '', minor ? membership.parentEmail2 : ''].filter(Boolean).join(', ');
  const signature = user ? `${user.firstName} ${user.lastName}\n${clubName}` : clubName;

  return (
    <div style={{ marginLeft: 10, marginRight: 10 }}>
      <h3>
        {player.firstName || player.lastName ? `${player.firstName} ${player.lastName}` : 'Nieuw lid'}
        {player.quitYear ? <small style={{ color: 'red' }}> (gestopt in {player.quitYear})</small> : null}
      </h3>

      <Section title="Aansluiting">
        <div style={{ marginBottom: 10 }}>
          <Form.Check inline id="competition-vttl" label="VTTL" checked={membership.vttl} onChange={e => setM({ vttl: e.target.checked })} />
          <Form.Check inline id="competition-sporta" label="Sporta" checked={membership.sporta} onChange={e => setM({ sporta: e.target.checked })} />
          <b>{competitionText(membership)}</b>
        </div>
        {isRecreant(membership) && <Alert variant="info">Recreant: enkel lid van de club, geen aansluiting bij een bond. Er is geen formulier.</Alert>}
        {membership.sporta && <Alert variant="warning">Het Sporta aansluitingsformulier is nog niet beschikbaar.</Alert>}
        <Field label="Datum" type="date" value={date} onChange={setDate} width={170} />
        <Field label="Voorzitter" value={chairman} onChange={setChairman} />
        <Field label="Secretaris" value={secretary} onChange={setSecretary} />
      </Section>

      {membership.vttl && (
        <Section title="VTTL">
          <Form.Group style={{ width: 350, display: 'inline-block', marginRight: 20, verticalAlign: 'top' }}>
            <Form.Label>VTTL formulier</Form.Label>
            <Form.Select value={formType} onChange={e => setFormType(e.target.value as MembershipFormType)}>
              {membershipForms.map(f => (
                <option key={f.key} value={f.key}>
                  {f.text}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group style={{ display: 'inline-block', verticalAlign: 'top' }}>
            <Form.Label>Statuut</Form.Label>
            {statuses.map(s => (
              <Form.Check
                key={s.key}
                type="radio"
                id={`status-${s.key}`}
                label={s.text}
                checked={membership.status === s.key}
                onChange={() => setM({ status: s.key })}
              />
            ))}
          </Form.Group>
          {!statuses.some(s => s.key === membership.status) && <Alert variant="warning">Kies een statuut dat op dit formulier staat.</Alert>}
          <br />
          {formType === 'renewal' ? (
            <Field
              label="VTTL lidnummer"
              value={vttlUniqueIndex ? String(vttlUniqueIndex) : ''}
              onChange={v => setVttlUniqueIndex(Number(v) || null)}
              width={150}
            />
          ) : (
            <>
              {formType === 'reaffiliation' && (
                <Field label="Laatste seizoen VTTL" value={membership.lastVttlSeason} onChange={lastVttlSeason => setM({ lastVttlSeason })} width={180} />
              )}
              <Field
                label="Klassement ander verbond"
                value={membership.otherFederationRanking}
                onChange={otherFederationRanking => setM({ otherFederationRanking })}
                width={200}
              />
              <Field
                label={formType === 'first' ? 'Bond' : 'Land'}
                value={membership.otherFederation}
                onChange={otherFederation => setM({ otherFederation })}
                width={200}
              />
            </>
          )}
        </Section>
      )}

      <Section title="Persoonlijk">
        <Field label={t('Voornaam')} value={player.firstName} onChange={firstName => setPlayer({ ...player, firstName })} />
        <Field label={t('Achternaam')} value={player.lastName} onChange={lastName => setPlayer({ ...player, lastName })} />
        <Field label={t('player.alias')} value={player.alias} onChange={alias => setPlayer({ ...player, alias })} width={150} />
        <br />
        <Field
          label="Geboortedatum"
          type="date"
          value={membership.birthDate?.substring(0, 10)}
          onChange={birthDate => setM({ birthDate: birthDate || null })}
          width={170}
        />
        <Form.Group style={{ width: 120, display: 'inline-block', marginRight: 20, verticalAlign: 'top' }}>
          <Form.Label>Geslacht</Form.Label>
          <Form.Select value={membership.gender ?? ''} onChange={e => setM({ gender: (e.target.value || null) as IPlayerMembership['gender'] })}>
            <option value="" />
            <option value="M">M</option>
            <option value="V">V</option>
          </Form.Select>
        </Form.Group>
        <Field label="Nationaliteit" value={membership.nationality} onChange={nationality => setM({ nationality })} width={150} />
        {!!membership.nationality && membership.nationality.trim().toUpperCase() !== 'BELG' && (
          <Field label="In België sinds" value={membership.residentInBelgiumSince} onChange={residentInBelgiumSince => setM({ residentInBelgiumSince })} />
        )}
        <Form.Check
          id="gsporter"
          label="G-sporter"
          checked={membership.gSporter}
          onChange={e => setM({ gSporter: e.target.checked })}
          style={{ display: 'inline-block', marginTop: 38 }}
        />
      </Section>

      <Section title="Contact">
        <Field label="Straat" value={membership.street} onChange={street => setM({ street })} width={300} />
        <Field label="Nr" value={membership.houseNumber} onChange={houseNumber => setM({ houseNumber })} width={80} />
        <Field label="Bus" value={membership.bus} onChange={bus => setM({ bus })} width={80} />
        <br />
        <Field label="Postcode" value={membership.postalCode} onChange={postalCode => setM({ postalCode })} width={100} />
        <Field label="Gemeente" value={membership.town} onChange={town => setM({ town })} />
        <br />
        <Field label={t('player.email')} value={player.contact.email} onChange={email => setContact({ email })} width={300} invalid={emailInvalid} />
        <Field label={t('player.gsm')} value={player.contact.mobile} onChange={mobile => setContact({ mobile })} width={180} />
        <Field label="Telefoon" value={membership.phone} onChange={phone => setM({ phone })} width={180} />
        {minor && (
          <>
            <br />
            <Field label="E-mail ouder 1" value={membership.parentEmail1} onChange={parentEmail1 => setM({ parentEmail1 })} width={300} />
            <Field label="E-mail ouder 2" value={membership.parentEmail2} onChange={parentEmail2 => setM({ parentEmail2 })} width={300} />
          </>
        )}
      </Section>

      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="primary" disabled={!canSave} onClick={save}>
          {t('common.save')}
        </Button>
        <Button variant="outline-primary" disabled={!canSave || !membership.vttl} onClick={download}>
          <i className="fa fa-file-pdf-o" /> Download PDF
        </Button>
        <Button variant="outline-danger" disabled={!canSave} onClick={() => setEmailOpen(true)}>
          <i className="fa fa-envelope-o" /> Mail naar lid
        </Button>
        <Button variant="secondary" onClick={onEnd}>
          {t('common.cancel')}
        </Button>
      </div>

      {emailOpen && (
        <MembershipEmailModal
          to={recipients}
          cc={params.email}
          subject={`${membership.vttl ? membershipForms.find(f => f.key === formType)!.text : 'Lidmaatschap'} ${clubName} ${seasonYear}-${seasonYear + 1}`}
          body={buildMembershipEmail(
            player.firstName,
            membership.vttl ? formType : null,
            documents().map(d => d.federation),
            params,
            signature,
          )}
          attachmentNames={documents().map(d => getPdfFileName(d.data))}
          onClose={() => setEmailOpen(false)}
          onSend={async email => {
            const attachments = await Promise.all(
              documents().map(async d => ({ fileName: getPdfFileName(d.data), base64: toBase64(await createMembershipPdf(d.data)) })),
            );
            try {
              await sendMembershipEmail({ to: email.to, cc: email.cc, subject: email.subject, email: email.body, attachments });
              dispatch(showSnackbar('Mail verstuurd'));
              setEmailOpen(false);
            } catch {
              dispatch(showSnackbar(t('common.apiFail')));
            }
          }}
        />
      )}
    </div>
  );
};
