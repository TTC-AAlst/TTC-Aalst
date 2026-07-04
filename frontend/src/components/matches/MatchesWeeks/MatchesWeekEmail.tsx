import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import { Modal } from 'react-bootstrap';
import { WeekTitle } from './WeekTitle';
import { WeekCalcer } from './WeekCalcer';
const QuillEditor = React.lazy(() => import('../../controls/Editor'));
import { buildHtml } from './htmlBuilder';
import { EmailButton } from '../../controls/Buttons/EmailButton';
import { t } from '../../../locales';
import { Competition, IMatch } from '../../../models/model-interfaces';
import { selectPlayers, selectUser, useTtcDispatch, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { getOpponentMatches } from '../../../reducers/readonlyMatchesReducer';
import { emailFormation } from '../../../reducers/matchesReducer';
import { logger } from '../../../utils/logger';

type MatchesWeekEmailProps = {
  weekCalcer: WeekCalcer;
  matches: IMatch[];
  prevMatches: IMatch[];
  compFilter: Competition;
};

/** EmailButton that turns into a MatchWeekEmailComposeComponent (Modal) */
export const MatchesWeekEmail = ({ compFilter, weekCalcer, matches, prevMatches }: MatchesWeekEmailProps) => {
  const [mailFormOpen, setMailFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [playersPlaying, setPlayersPlaying] = useState({});
  const players = useTtcSelector(selectPlayers);
  const ownUser = useTtcSelector(selectUser);
  const dispatch = useTtcDispatch();
  const fullState = useTtcSelector(state => state);

  useEffect(() => {
    matches.concat(prevMatches).forEach(match => {
      if (!match.teamId) {
        const message = `MatchesWeekEmail: MatchId=${match.id}: teamId ${match.teamId} not found. Match=${JSON.stringify(match)}`;
        // eslint-disable-next-line no-console
        console.warn(message);
        logger.error(message);
      } else {
        dispatch(getOpponentMatches({ teamId: match.teamId, opponent: match.opponent }));
      }
    });
  });

  const emailFormationWrapper = (justMe: boolean) => {
    const week = weekCalcer.getWeek();
    const title = `${compFilter} Week ${weekCalcer.currentWeek}: ${week?.start.format('D/M')} - ${week?.end.format('D/M')}`;
    dispatch(emailFormation({ title, email, justMe, players: playersPlaying }));
    setMailFormOpen(false);
  };

  if (!mailFormOpen) {
    const user = players.find(p => p.id === ownUser.playerId)!;
    return (
      <EmailButton
        onClick={() => {
          setMailFormOpen(!mailFormOpen);
          const defaultEmail = buildHtml(fullState, user, compFilter, matches, prevMatches);
          setPlayersPlaying(defaultEmail.players);
          setEmail(defaultEmail.email);
        }}
        tooltip={t('week.emailTitle')}
      />
    );
  }

  return (
    <Modal size="xl" show onHide={() => setMailFormOpen(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {compFilter} {t('week.emailTitle')}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ height: 420 }}>
        <WeekTitle weekCalcer={weekCalcer} style={{ marginTop: 0 }} />
        <QuillEditor text={email} style={{ height: 300 }} onChange={value => setEmail(value)} readOnly={false} />
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={() => setMailFormOpen(false)}>{t('common.cancel')}</Button>
        <Button variant="danger" onClick={() => emailFormationWrapper(false)}>
          {t('week.sendEmail')}
        </Button>
        <Button variant="danger" onClick={() => emailFormationWrapper(true)}>
          {t('week.sendTestEmail')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
