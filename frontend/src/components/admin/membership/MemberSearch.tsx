import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import { IStorePlayer } from '../../../models/model-interfaces';
import { useTtcSelector } from '../../../utils/hooks/storeHooks';
import { IVttlMember, frenoySeasonToText, isTransfer, membershipForms, suggestFormType } from './membershipModels';
import { searchVttl } from './membershipApi';

type MemberSearchProps = {
  currentFrenoySeason: number;
  ownClubCode: string;
  onNew: (name: string) => void;
  onPlayer: (player: IStorePlayer) => void;
  onVttl: (member: IVttlMember) => void;
};

const matches = (player: IStorePlayer, search: string): boolean => {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const name = `${player.firstName} ${player.lastName} ${player.alias}`.toLowerCase();
  return words.length > 0 && words.every(word => name.includes(word));
};

export const MemberSearch = ({ currentFrenoySeason, ownClubCode, onNew, onPlayer, onVttl }: MemberSearchProps) => {
  const [search, setSearch] = useState('');
  const [vttl, setVttl] = useState<IVttlMember[] | null>(null);
  const [vttlError, setVttlError] = useState(false);
  const [loading, setLoading] = useState(false);
  const players = useTtcSelector(state => state.players);
  const quitters = useTtcSelector(state => state.playersQuitters);

  const dbMatches = search.trim().length > 2 ? players.concat(quitters).filter(p => matches(p, search)) : [];

  const doSearch = async () => {
    setLoading(true);
    setVttlError(false);
    try {
      setVttl(await searchVttl(search.trim()));
    } catch {
      setVttl(null);
      setVttlError(true);
    } finally {
      setLoading(false);
    }
  };

  const formText = (member: IVttlMember) => membershipForms.find(f => f.key === suggestFormType(member, currentFrenoySeason, ownClubCode))!.text;

  return (
    <div>
      <h3>Nieuw lid</h3>
      <p>Zoek eerst of de persoon al bij ons of bij de VTTL gekend is.</p>
      <Form
        onSubmit={e => {
          e.preventDefault();
          doSearch();
        }}
        style={{ display: 'flex', gap: 10, maxWidth: 500 }}
      >
        <Form.Control placeholder="Naam" value={search} onChange={e => setSearch(e.target.value)} />
        <Button type="submit" disabled={search.trim().length < 3 || loading}>
          {loading ? 'Zoeken...' : 'Zoek VTTL'}
        </Button>
      </Form>

      {dbMatches.length > 0 && (
        <>
          <h4 style={{ marginTop: 20 }}>Bij ons gekend</h4>
          <Table size="sm" hover style={{ maxWidth: 700 }}>
            <tbody>
              {dbMatches.map(ply => (
                <tr key={ply.id}>
                  <td>
                    {ply.firstName} {ply.lastName} ({ply.alias})
                  </td>
                  <td>{ply.quitYear ? `Gestopt in ${ply.quitYear}` : 'Actief'}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => onPlayer(ply)}>
                      Kies
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {vttlError && (
        <Alert variant="warning" style={{ marginTop: 20, maxWidth: 700 }}>
          VTTL zoeken mislukt.
        </Alert>
      )}

      {vttl && (
        <>
          <h4 style={{ marginTop: 20 }}>VTTL</h4>
          {vttl.length === 0 ? (
            <p>Niet gevonden in de VTTL ledenlijst van de laatste seizoenen: eerste aansluiting.</p>
          ) : (
            <Table size="sm" hover style={{ maxWidth: 900 }}>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Lidnummer</th>
                  <th>Club</th>
                  <th>Laatste seizoen</th>
                  <th>Klassement</th>
                  <th>Formulier</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vttl.map(member => (
                  <tr key={member.uniqueIndex}>
                    <td>
                      {member.firstName} {member.lastName}
                    </td>
                    <td>{member.uniqueIndex}</td>
                    <td>{member.club}</td>
                    <td>{frenoySeasonToText(member.season)}</td>
                    <td>{member.ranking}</td>
                    <td>{isTransfer(member, currentFrenoySeason, ownClubCode) ? <span style={{ color: 'red' }}>Transfer!</span> : formText(member)}</td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => onVttl(member)}>
                        Kies
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}

      <Button style={{ marginTop: 20 }} variant="primary" onClick={() => onNew(search.trim())}>
        Nieuw lid aanmaken
      </Button>
    </div>
  );
};
