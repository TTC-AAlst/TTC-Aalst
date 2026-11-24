import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { t } from '../../locales';
import http from '../../utils/httpClient';

type Top = { place: number; name: string; klassement?: string };
type NotableWin = { winner: string; winnerKlassement: string; loser: string; loserKlassement: string; diff: number; round: string; score: string };

type ClubTournament = {
  id: number;
  slug: string;
  name: string;
  eventType: string;
  type: string;
  date: string;
  winner: string | null;
  url: string;
  results: {
    top4?: Top[];
    troost?: Top[];
    notableWins?: NotableWin[];
    playerCount?: number;
  };
};

const Podium = ({ tournament }: { tournament: ClubTournament }) => {
  const top = tournament.results.top4 ?? [];
  const wins = tournament.results.notableWins ?? [];
  const troostWinner = (tournament.results.troost ?? []).find(x => x.place === 1);
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ background: '#0F1B2D', color: '#FFFFFF' }}>
        <small style={{ color: '#B8C4D6' }}>
          {dayjs(tournament.date).format('D MMMM YYYY')} · {tournament.type === 'dubbel' ? t('clubTournaments.double') : t('clubTournaments.single')}
          {tournament.results.playerCount ? ` · ${tournament.results.playerCount} ${t('clubTournaments.players')}` : ''}
        </small>
        <h3 style={{ margin: '4px 0 0', fontSize: 20 }}>{tournament.name}</h3>
      </div>
      <div className="card-body">
        {tournament.winner && (
          <p style={{ marginBottom: 8 }}>
            <small className="text-muted">{t('clubTournaments.champion')}</small>
            <br />
            <strong style={{ fontSize: 18 }}>{tournament.winner}</strong>
          </p>
        )}
        <ol style={{ paddingLeft: 20, marginBottom: 12 }} start={2}>
          {top
            .filter(x => x.place > 1)
            .map(x => (
              <li key={`${x.place}-${x.name}`} value={x.place}>
                {x.name} {x.klassement && <small className="text-muted">{x.klassement}</small>}
              </li>
            ))}
        </ol>
        {troostWinner && (
          <p style={{ marginBottom: 12 }}>
            <small className="text-muted">{t('clubTournaments.consolation')}:</small> {troostWinner.name}
          </p>
        )}
        {wins.length > 0 && (
          <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            <small className="text-muted" style={{ fontWeight: 700 }}>
              {t('clubTournaments.notable').toUpperCase()}
            </small>
            {wins.slice(0, 3).map(w => (
              <div key={`${w.winner}-${w.loser}-${w.round}`} style={{ fontSize: 14 }}>
                {w.winner} ({w.winnerKlassement}) {t('clubTournaments.beat')} {w.loser} ({w.loserKlassement}) — <strong>+{w.diff}</strong>
              </div>
            ))}
          </div>
        )}
        {tournament.url && (
          <a href={tournament.url} target="_blank" rel="noopener noreferrer">
            {t('clubTournaments.fullResults')} →
          </a>
        )}
      </div>
    </div>
  );
};

export const ClubTournaments = () => {
  const [tournaments, setTournaments] = useState<ClubTournament[] | null>(null);

  useEffect(() => {
    http
      .get<ClubTournament[]>('/club-tournaments')
      .then(setTournaments)
      .catch(() => setTournaments([]));
  }, []);

  if (tournaments === null) {
    return null;
  }

  const [latest, ...earlier] = tournaments;
  const honours = tournaments.filter(x => x.eventType === 'Clubkampioenschap' && x.winner);

  return (
    <div style={{ marginTop: 10, maxWidth: 720 }}>
      <h1 style={{ fontSize: 28 }}>{t('clubTournaments.title')}</h1>
      {!latest && <p>{t('clubTournaments.none')}</p>}
      {latest && <Podium tournament={latest} />}

      {honours.length > 0 && (
        <>
          <h2 style={{ fontSize: 20 }}>
            {t('clubTournaments.honours')}: Clubkampioenschap
          </h2>
          <table className="table table-sm" style={{ marginBottom: 20 }}>
            <tbody>
              {honours.map(x => (
                <tr key={x.id}>
                  <td style={{ width: 80 }}>{dayjs(x.date).format('YYYY')}</td>
                  <td>
                    <strong>{x.winner}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {earlier.length > 0 && (
        <>
          <h2 style={{ fontSize: 20 }}>{t('clubTournaments.earlier')}</h2>
          <div className="list-group">
            {earlier.map(x => (
              <a key={x.id} className="list-group-item list-group-item-action" href={x.url} target="_blank" rel="noopener noreferrer">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>
                    <strong>{x.name}</strong>
                    <br />
                    <small className="text-muted">{dayjs(x.date).format('MMM YYYY')}</small>
                  </span>
                  <span className="text-muted">{x.winner}</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
