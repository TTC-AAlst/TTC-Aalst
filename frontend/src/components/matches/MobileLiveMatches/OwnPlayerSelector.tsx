import { useRef, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { Competition, IMatch, IPlayer } from '../../../models/model-interfaces';
import { useTtcDispatch, useTtcSelector, selectPlayers } from '../../../utils/hooks/storeHooks';
import { editMatchPlayers } from '../../../reducers/matchesReducer';
import { t } from '../../../locales';
import { Icon } from '../../controls/Icons/Icon';

const latinize = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

type OwnPlayerSelectorProps = {
  match: IMatch;
  initialOpen?: boolean;
  onClose?: () => void;
};

type PlayerRowProps = {
  player: IPlayer;
  competition: Competition;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (player: IPlayer) => void;
};

const getBackgroundColor = (isSelected: boolean, isDisabled: boolean): string => {
  if (isSelected) return '#e3f2fd';
  if (isDisabled) return '#f5f5f5';
  return '#fff';
};

const PlayerRow = ({ player, competition, isSelected, isDisabled, onToggle }: PlayerRowProps) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      borderRadius: 4,
      backgroundColor: getBackgroundColor(isSelected, isDisabled),
      border: `1px solid ${isSelected ? '#2196f3' : '#ddd'}`,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      margin: 0,
    }}
  >
    <Form.Check type="checkbox" checked={isSelected} onChange={() => onToggle(player)} disabled={isDisabled} />
    <span style={{ flex: 1 }}>{player.alias}</span>
    <span style={{ fontWeight: 600, fontSize: '0.85em', color: '#666' }}>{player.getCompetition(competition).ranking}</span>
  </label>
);

export const OwnPlayerSelector = ({ match: matchProp, initialOpen = false, onClose }: OwnPlayerSelectorProps) => {
  const dispatch = useTtcDispatch();
  const allPlayers = useTtcSelector(selectPlayers);

  const eligiblePlayers = allPlayers.filter(p => {
    if (!p.active) return false;
    const comp = p.getCompetition(matchProp.competition);
    return comp && comp.ranking;
  });

  const requiredPlayerCount = matchProp.getTeamPlayerCount();
  const ownMatchPlayers = matchProp.getOwnPlayers();

  const getPreSelectedPlayers = (): IPlayer[] => {
    if (!matchProp.block && !matchProp.isSyncedWithFrenoy) return [];
    const statusToMatch = matchProp.isSyncedWithFrenoy ? 'Major' : matchProp.block;
    const confirmedIds = ownMatchPlayers.filter(mp => mp.status === statusToMatch).map(mp => mp.playerId);
    return eligiblePlayers.filter(p => confirmedIds.includes(p.id));
  };

  const [isFormOpen, setIsFormOpen] = useState(initialOpen);
  const [selectedPlayers, setSelectedPlayers] = useState<IPlayer[]>(getPreSelectedPlayers);
  const [isSaving, setIsSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const handlePlayerToggle = (player: IPlayer) => {
    setSelectedPlayers(prev => {
      const isAlreadySelected = prev.some(p => p.id === player.id);
      if (isAlreadySelected) {
        return prev.filter(p => p.id !== player.id);
      }
      if (prev.length >= requiredPlayerCount) {
        return prev;
      }
      const next = [...prev, player];
      if (next.length === requiredPlayerCount) {
        handleSave(next);
      } else if (searchText) {
        setSearchText('');
        searchRef.current?.focus();
      }
      return next;
    });
  };

  const handleSave = async (players?: IPlayer[]) => {
    const toSave = players || selectedPlayers;
    setIsSaving(true);
    try {
      await dispatch(
        editMatchPlayers({
          matchId: matchProp.id,
          teamId: matchProp.teamId,
          playerIds: toSave.map(p => p.id),
          blockAlso: true,
          newStatus: 'Major',
          comment: '',
        }),
      );
      setIsFormOpen(false);
      onClose?.();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isFormOpen) {
    return (
      <Button size="sm" variant="outline-primary" onClick={() => setIsFormOpen(true)}>
        {t('match.selectOwnPlayers')}
      </Button>
    );
  }

  const handleClose = () => {
    setIsFormOpen(false);
    setSearchText('');
    setSelectedPlayers([]);
    onClose?.();
  };

  // Frequency: count how often each player appeared in synced team matches
  const teamMatches = matchProp
    .getTeam()
    .getMatches()
    .filter(m => m.isSyncedWithFrenoy);
  const playerFrequency: Record<number, number> = {};
  teamMatches.forEach(m => {
    m.getOwnPlayers().forEach(mp => {
      playerFrequency[mp.playerId] = (playerFrequency[mp.playerId] || 0) + 1;
    });
  });

  const filteredPlayers = eligiblePlayers
    .filter(player => latinize(player.alias).includes(latinize(searchText)))
    .sort((a, b) => {
      const aSelected = selectedPlayers.some(p => p.id === a.id);
      const bSelected = selectedPlayers.some(p => p.id === b.id);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return (playerFrequency[b.id] || 0) - (playerFrequency[a.id] || 0);
    });

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Form.Control ref={searchRef} type="text" size="sm" placeholder={t('common.search')} value={searchText} onChange={e => setSearchText(e.target.value)} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
        {filteredPlayers.map(player => {
          const isSelected = selectedPlayers.some(p => p.id === player.id);
          return (
            <PlayerRow
              key={player.id}
              player={player}
              competition={matchProp.competition}
              isSelected={isSelected}
              isDisabled={!isSelected && selectedPlayers.length >= requiredPlayerCount}
              onToggle={handlePlayerToggle}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <Button variant="outline-secondary" size="sm" onClick={handleClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={() => handleSave()} disabled={isSaving}>
          {isSaving ? (
            <>
              <Spinner animation="border" size="sm" style={{ marginRight: 6 }} />
              {t('common.saving')}
            </>
          ) : (
            <>
              <Icon fa="fa fa-check" />
              <span style={{ marginLeft: 6 }}>{t('common.save')}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
