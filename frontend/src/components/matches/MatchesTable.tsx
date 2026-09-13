import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import { ViewMatchDetailsButton } from './controls/ViewMatchDetailsButton';
import { CannotEditMatchIcon } from './controls/CannotEditMatchIcon';
import { OpenMatchForEditButton } from './controls/OpenMatchForEditButton';
import { SaveMatchButtons } from './controls/SaveMatchButtons';
import { IMatch, PickedPlayer } from '../../models/model-interfaces';
import { useViewport } from '../../utils/hooks/useViewport';
import { editMatchPlayers } from '../../reducers/matchesReducer';
import { ReadOnlyMatchesTable } from './MatchesTable/ReadOnlyMatchesTable';
import { MatchesTableDateCell, MatchesTableFrenoyLinkCell, MatchesTableHeader, MatchesTableMatchVsCell } from './MatchesTable/MatchesTableCells';
import { getRowStripeColor, toUndecidedPlayer } from './MatchesTable/matchesTableUtil';
import { MatchCommentForm, MatchesTableCommentRow, MatchesTableEditPlayersRow } from './MatchesTable/EditMatchesTableCells';
import { selectUser, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';

type MatchesTableProps = {
  matches: IMatch[];
  /** Allow "MatchVs" to display just against whom on small devices */
  allowOpponentOnly?: boolean;
  editMode?: boolean;
  /** Force striped rows. When false, when the current user plays in the match, have a different color instead */
  striped?: boolean;
  ownTeamLink?: 'main' | 'matches' | 'ranking' | 'players' | 'matchesTable' | 'week';
};

export const MatchesTable = ({ matches, allowOpponentOnly, editMode, striped, ownTeamLink = 'main' }: MatchesTableProps) => {
  const viewWidth = useViewport().width;
  const dispatch = useTtcDispatch();
  const user = useTtcSelector(selectUser);

  const [editMatch, setEditMatch] = useState<IMatch | null>(null);
  const [players, setPlayers] = useState<PickedPlayer[]>([]);
  const [playersEdit, setPlayersEdit] = useState<PickedPlayer[]>([]);
  const [comment, setComment] = useState<MatchCommentForm>({ edit: false, value: '' });

  if (!editMode) {
    return <ReadOnlyMatchesTable matches={matches} forceStripes={!!striped} ownTeamLink={ownTeamLink} allowOpponentOnly={allowOpponentOnly} />;
  }

  const userStatus: 'Major' | 'Captain' = user.canManageTeams() ? 'Major' : 'Captain';

  const openEditMatchForm = (match: IMatch) => {
    const team = match.getTeam();
    const playerChoices = match.getPlayerFormation('Play');
    const playerChoicesPlayerIds = playerChoices.map(x => x.player.id);
    const playersWithoutChoice: PickedPlayer[] = team
      .getPlayers()
      .filter(x => playerChoicesPlayerIds.indexOf(x.player.id) === -1)
      .map(x => toUndecidedPlayer(match, x));

    let newPlayersEdit = match.getPlayerFormation(userStatus);
    if (newPlayersEdit.length === 0) {
      if (userStatus === 'Major') {
        newPlayersEdit = match.getPlayerFormation('Captain');
      }
    }

    setEditMatch(match);
    setPlayers([...playerChoices.map(x => ({ ...x, matchId: match.id })), ...playersWithoutChoice]);
    setPlayersEdit(newPlayersEdit.map(pe => ({ ...pe, matchId: match.id })));
    setComment({ edit: false, value: match.formationComment || '' });
  };

  const saveFormation = (block: false | 'Captain' | 'Major') => {
    dispatch(
      editMatchPlayers({
        matchId: editMatch!.id,
        playerIds: playersEdit.map(x => x.id),
        blockAlso: !!block,
        newStatus: block || userStatus,
        comment: comment.value,
      }),
    );

    setEditMatch(null);
    setPlayers([]);
    setPlayersEdit([]);
  };

  return (
    <Table className="matches-table">
      <MatchesTableHeader editMode matches={matches} />
      {matches.map((match, i) => {
        const stripeColor = { backgroundColor: getRowStripeColor(i, match, user.playerId, !!striped) };
        return (
          <tbody key={match.id}>
            <tr key={match.id} style={stripeColor}>
              <MatchesTableDateCell match={match} matches={matches} />
              <MatchesTableFrenoyLinkCell match={match} />
              <MatchesTableMatchVsCell match={match} ownTeamLink={ownTeamLink} allowOpponentOnly={allowOpponentOnly} />
              <td>
                {match.isSyncedWithFrenoy ? (
                  <ViewMatchDetailsButton match={match} size={viewWidth < 600 ? 'sm' : null} />
                ) : !user.canEditMatchPlayers(match) ? (
                  <CannotEditMatchIcon />
                ) : editMatch?.id !== match.id ? (
                  <OpenMatchForEditButton onClick={() => openEditMatchForm(match)} match={match} />
                ) : (
                  <SaveMatchButtons
                    canMajorBlock={user.canManageTeams()}
                    onSave={() => saveFormation(false)}
                    onBlock={newBlock => saveFormation(newBlock)}
                    onCommentsToggle={() => setComment({ ...comment, edit: !comment.edit })}
                  />
                )}
              </td>
            </tr>
            <MatchesTableCommentRow match={match} editMatch={editMatch} comment={comment} setComment={setComment} stripeColor={stripeColor} />
            <MatchesTableEditPlayersRow
              match={match}
              editMatch={editMatch}
              stripeColor={stripeColor}
              playersEdit={playersEdit}
              players={players}
              setPlayersEdit={setPlayersEdit}
            />
          </tbody>
        );
      })}
    </Table>
  );
};
