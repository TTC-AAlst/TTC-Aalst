import React, { useState } from 'react';
import dayjs from 'dayjs';
import cn from 'classnames';
import Table from 'react-bootstrap/Table';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import { getPlayingStatusClass } from '../../models/PlayerModel';
import { CommentButton } from '../controls/Buttons/CommentButton';
import MatchVs from '../matches/Match/MatchVs';
import { Icon } from '../controls/Icons/Icon';
import { SwitchBetweenFirstAndLastRoundButton, getFirstOrLastMatches, getFirstOrLast } from '../teams/SwitchBetweenFirstAndLastRoundButton';
import { t } from '../../locales';
import { selectPlayer } from '../../reducers/matchesReducer';
import { IMatch, ITeam, MatchPlayerStatus } from '../../models/model-interfaces';
import { useTtcDispatch } from '../../utils/hooks/storeHooks';

type PlayerLineupProps = {
  playerId: number;
  teams: ITeam[];
  disableBlockedMatches?: boolean;
};

const PlayerLineup = ({ playerId, teams: propTeams, disableBlockedMatches: _disableBlockedMatches }: PlayerLineupProps) => {
  const dispatch = useTtcDispatch();
  const [filter, setFilter] = useState<string | null>(null);
  const [showCommentId, setShowCommentId] = useState(0);
  const [comment, setComment] = useState('');
  const [matchesFilter, setMatchesFilter] = useState(getFirstOrLast);

  const onChangePlaying = (match: IMatch, status: MatchPlayerStatus, statusNote: string) => {
    dispatch(
      selectPlayer({
        matchId: match.id,
        status,
        statusNote: showCommentId ? comment : statusNote || '',
        playerId,
      }),
    );
    setShowCommentId(0);
    setComment('');
  };

  let teams = propTeams;
  if (filter) {
    teams = teams.filter(x => x.competition === filter);
  }

  const allMatchesToCome = teams
    .map(team => team.getMatches())
    .flat()
    // A derby is in the calendar of both our teams, but a player answers it once
    .filter((match, index, all) => all.findIndex(m => m.id === match.id) === index)
    .filter(match => dayjs().isBefore(match.date))
    .sort((a, b) => a.date.valueOf() - b.date.valueOf());

  const { matches, hasMore } = getFirstOrLastMatches(allMatchesToCome, matchesFilter);
  const allText = t('common.all');
  const activeFilter = filter || allText;

  const uniqueCompetitionCount = propTeams.map(team => team.competition).filter((competition, index, arr) => arr.indexOf(competition) === index).length;

  return (
    <div>
      {uniqueCompetitionCount > 1 ? (
        <div className="btn-group" style={{ padding: 5 }}>
          {[allText, 'Vttl', 'Sporta'].map(button => (
            <button
              type="button"
              className={cn('btn', button === activeFilter ? 'btn-info' : 'btn-outline-secondary')}
              key={button}
              onClick={() => setFilter(button === allText ? null : button)}
            >
              {button}
            </button>
          ))}
        </div>
      ) : null}

      <Table size="sm">
        <thead>
          <tr>
            <th className="d-none d-lg-table-cell">{t('common.frenoy')}</th>
            <th className="d-none d-sm-table-cell">{t('common.date')}</th>
            <th>{t('teamCalendar.match')}</th>
            <th>{t('profile.play.tableTitle')}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(match => {
            const formation = match.getPlayerFormation('Play');
            const matchPlayer = formation.find(x => x.id === playerId)?.matchPlayer;
            const statusNote = matchPlayer ? matchPlayer.statusNote : '';

            const allFormation = match.getPlayerFormation(undefined);
            const playerInAllFormation = allFormation.find(x => x.id === playerId)?.matchPlayer;
            const isInBlockedFormation = match.block && playerInAllFormation?.status === match.block;

            const getOnChangePlaying = (status: MatchPlayerStatus) => () => onChangePlaying(match, status, statusNote);

            let buttons: React.ReactNode;
            if (match.isSyncedWithFrenoy) {
              buttons = (
                <div className="text-muted">
                  <Icon fa="fa fa-check" style={{ marginRight: 4 }} />
                  {t('profile.play.matchPlayed')}
                </div>
              );
            } else if (isInBlockedFormation) {
              buttons = (
                <div className="text-muted">
                  <Icon fa="fa fa-lock" style={{ marginRight: 4 }} />
                  {t('profile.play.contactCaptain')}
                </div>
              );
            } else {
              buttons = (
                <ButtonToolbar>
                  <Button style={{ marginBottom: 5, width: 90 }} variant="success" onClick={getOnChangePlaying('Play')}>
                    {t('profile.play.canPlay')}
                  </Button>
                  <Button style={{ marginBottom: 5, width: 90 }} variant="danger" onClick={getOnChangePlaying('NotPlay')}>
                    {t('profile.play.canNotPlay')}
                  </Button>
                  <Button style={{ marginBottom: 5, width: 90 }} variant="info" onClick={getOnChangePlaying('Maybe')}>
                    {t('profile.play.canMaybe')}
                  </Button>
                  <Button style={{ width: 90 }} variant="secondary" onClick={getOnChangePlaying('DontKnow')}>
                    {t('profile.play.canDontKnow')}
                  </Button>
                  {showCommentId !== match.id ? (
                    <CommentButton
                      onClick={() => {
                        setShowCommentId(match.id);
                        setComment(statusNote);
                      }}
                      className="d-none d-sm-inline"
                    />
                  ) : null}
                </ButtonToolbar>
              );
            }

            return (
              <tr key={match.id} className={`table-${getPlayingStatusClass(matchPlayer?.status)}`}>
                <td className="d-none d-lg-table-cell">{match.frenoyMatchId}</td>
                <td className="d-none d-sm-table-cell">{t('match.date', match.getDisplayDate())}</td>
                <td>
                  <span className="d-block d-md-none">
                    {t('match.date', match.getDisplayDate())}
                    <br />
                  </span>
                  <MatchVs match={match} />

                  {showCommentId !== match.id && !match.block ? (
                    <CommentButton
                      onClick={() => {
                        setShowCommentId(match.id);
                        setComment(matchPlayer ? matchPlayer.statusNote : '');
                      }}
                      className="d-block d-md-none"
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                  {showCommentId === match.id ? (
                    <div className="d-block d-md-none" style={{ marginTop: 12 }}>
                      <br />
                      <br />
                      <CommentEditForm onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComment(e.target.value)} value={comment || ''} />
                    </div>
                  ) : matchPlayer && matchPlayer.statusNote ? (
                    <div className="d-block d-md-none">
                      <Comment matchPlayer={matchPlayer} />
                    </div>
                  ) : null}
                </td>
                <td style={{ width: '1%' }} className="d-table-cell d-md-none">
                  {buttons}
                </td>
                <td className="d-none d-md-table-cell">
                  {buttons}
                  {showCommentId === match.id ? (
                    <CommentEditForm onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComment(e.target.value)} value={comment || ''} />
                  ) : matchPlayer && matchPlayer.statusNote ? (
                    <Comment matchPlayer={matchPlayer} />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {hasMore ? <SwitchBetweenFirstAndLastRoundButton setMatchesFilter={f => setMatchesFilter(f)} matchesFilter={matchesFilter} /> : null}
    </div>
  );
};

const Comment = ({ matchPlayer }: { matchPlayer: { statusNote: string } }) => (
  <div>
    <strong>{t('profile.play.extraComment')}</strong>
    <br />
    {matchPlayer.statusNote}
  </div>
);

type CommentEditFormProps = {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
};

const CommentEditForm = ({ onChange, value }: CommentEditFormProps) => (
  <div>
    <Form.Label>{t('profile.play.extraCommentHelp')}</Form.Label>
    <FormControl type="text" value={value} placeholder={t('profile.play.extraComment')} onChange={onChange} />
  </div>
);

export default PlayerLineup;
