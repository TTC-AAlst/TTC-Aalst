import { useState } from 'react';
import dayjs from 'dayjs';
import Table from 'react-bootstrap/Table';
import { Button, Modal } from 'react-bootstrap';
import { TrophyIcon } from '../../controls/Icons/TrophyIcon';
import { ThumbsUpIcon, ThumbsDownIcon } from '../../controls/Icons/ThumbsIcons';
import { Icon } from '../../controls/Icons/Icon';
import { Competition, IMatch, PlayerEncounter } from '../../../models/model-interfaces';
import { t } from '../../../locales';
import { selectUser, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { useViewport } from '../../../utils/hooks/useViewport';
import storeUtil from '../../../storeUtil';
import { OpponentPlayerNoteButton } from './OpponentPlayerNote';

type OurPlayerInfo = {
  playerId: number;
  alias: string;
  uniqueIndex: number;
};

export const PreviousEncounters = ({ match }: { match: IMatch }) => {
  const user = useTtcSelector(selectUser);
  const formationPlayers = match.getOwnPlayers().filter(ply => ply.status === match.block);

  // Build list of players to show: formation players + current user if not in formation
  const playersToShow: OurPlayerInfo[] = formationPlayers.map(ply => ({
    playerId: ply.playerId,
    alias: ply.alias,
    uniqueIndex: ply.uniqueIndex,
  }));

  // Add current user if they're not in the formation
  const currentPlayer = user?.playerId ? storeUtil.getPlayer(user.playerId) : null;
  const currentPlayerUniqueIndex = currentPlayer?.getCompetition(match.competition)?.uniqueIndex;
  const isCurrentUserPlaying = formationPlayers.some(ply => ply.playerId === user?.playerId);

  if (!isCurrentUserPlaying && currentPlayer && currentPlayerUniqueIndex) {
    playersToShow.push({
      playerId: currentPlayer.id,
      alias: currentPlayer.alias,
      uniqueIndex: currentPlayerUniqueIndex,
    });
  }

  const allUniqueIds = playersToShow.map(p => p.uniqueIndex);
  const encounters = useTtcSelector(state =>
    state.matchInfo.previousEncounters
      .filter(encounter => encounter.requestMatchId === match.id)
      .filter(encounter => allUniqueIds.includes(encounter.homePlayerUniqueId) || allUniqueIds.includes(encounter.awayPlayerUniqueId)),
  ).sort((a, b) => dayjs(b.matchDate).diff(dayjs(a.matchDate)));

  const theirPlayers = match.getTheirPlayers();

  if (encounters.length === 0) {
    return (
      <div className="match-card-tab-content" style={{ fontStyle: 'italic', color: '#666' }}>
        {t('match.noEncountersYet')}
      </div>
    );
  }

  return (
    <div className="match-card-tab-content">
      {playersToShow.map((player, index) => (
        <PlayerEncountersSection
          key={player.playerId}
          player={player}
          encounters={encounters}
          theirPlayers={theirPlayers}
          showDivider={index > 0}
          competition={match.competition}
        />
      ))}
    </div>
  );
};

type PlayerEncountersSectionProps = {
  player: OurPlayerInfo;
  encounters: PlayerEncounter[];
  theirPlayers: { name: string; uniqueIndex: number; ranking: string }[];
  showDivider: boolean;
  competition: Competition;
};

const PlayerEncountersSection = ({ player, encounters, theirPlayers, showDivider, competition }: PlayerEncountersSectionProps) => {
  const playerEncounters = encounters.filter(enc => enc.homePlayerUniqueId === player.uniqueIndex || enc.awayPlayerUniqueId === player.uniqueIndex);

  const hasAnyEncountersWithCurrentOpponents = theirPlayers.some(theirPlayer =>
    playerEncounters.some(enc => enc.homePlayerUniqueId === theirPlayer.uniqueIndex || enc.awayPlayerUniqueId === theirPlayer.uniqueIndex),
  );

  return (
    <div>
      {showDivider && <hr />}
      <h2>{player.alias}</h2>
      {!hasAnyEncountersWithCurrentOpponents ? (
        <div style={{ fontStyle: 'italic', color: '#666' }}>{t('match.noEncountersYet')}</div>
      ) : (
        theirPlayers.map(theirPlayer => {
          const vsEncounter = playerEncounters.filter(
            enc => enc.homePlayerUniqueId === theirPlayer.uniqueIndex || enc.awayPlayerUniqueId === theirPlayer.uniqueIndex,
          );

          return (
            <OpponentEncounterRow
              key={theirPlayer.uniqueIndex}
              theirPlayer={theirPlayer}
              encounters={vsEncounter}
              ourPlayerUniqueIndex={player.uniqueIndex}
              competition={competition}
            />
          );
        })
      )}
    </div>
  );
};

type OpponentEncounterRowProps = {
  theirPlayer: { name: string; uniqueIndex: number; ranking: string };
  encounters: PlayerEncounter[];
  ourPlayerUniqueIndex: number;
  competition: Competition;
};

const OpponentEncounterRow = ({ theirPlayer, encounters, ourPlayerUniqueIndex, competition }: OpponentEncounterRowProps) => {
  const [showTable, setShowTable] = useState(false);
  const viewport = useViewport();
  const isSmallDevice = viewport.width < 500;

  const wins = encounters.filter(encounter => {
    const home = encounter.homePlayerUniqueId === ourPlayerUniqueIndex;
    return (home && encounter.homePlayerSets > encounter.awayPlayerSets) || (!home && encounter.awayPlayerSets > encounter.homePlayerSets);
  }).length;
  const losses = encounters.length - wins;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h5 style={{ margin: 0 }}>
          {theirPlayer.name} <small>({theirPlayer.ranking})</small>
        </h5>
        {encounters.length > 0 ? (
          <Button size="sm" variant="outline-secondary" onClick={() => setShowTable(!showTable)} style={{ padding: '2px 6px' }}>
            {!!wins && (
              <>
                <ThumbsUpIcon />
                <span>{wins}</span>
              </>
            )}
            {!!losses && (
              <>
                <ThumbsDownIcon style={{ marginLeft: wins ? 16 : 0 }} />
                <span>{losses}</span>
              </>
            )}
          </Button>
        ) : (
          <span style={{ fontStyle: 'italic', color: '#999' }}>{t('match.noDuels')}</span>
        )}
        <OpponentPlayerNoteButton competition={competition} opponentUniqueIndex={theirPlayer.uniqueIndex} opponentName={theirPlayer.name} />
      </div>
      {showTable && (
        <div style={{ marginTop: 8, marginLeft: isSmallDevice ? -16 : 0 }}>
          <EncountersTable encounters={encounters} ourPlayerUniqueIndex={ourPlayerUniqueIndex} />
        </div>
      )}
    </div>
  );
};

export const PreviousEncountersButtonModal = ({ encounters, ourPlayerUniqueIndex }: { encounters: PlayerEncounter[]; ourPlayerUniqueIndex: number }) => {
  const [open, setOpen] = useState(false);
  const viewport = useViewport();
  const isSmallDevice = viewport.width < 500;

  if (encounters.length === 0) {
    return null;
  }

  // Calculate wins and losses
  const wins = encounters.filter(encounter => {
    const home = encounter.homePlayerUniqueId === ourPlayerUniqueIndex;
    return (home && encounter.homePlayerSets > encounter.awayPlayerSets) || (!home && encounter.awayPlayerSets > encounter.homePlayerSets);
  }).length;
  const losses = encounters.length - wins;

  if (!open) {
    return (
      <Button size="sm" variant="outline-secondary" onClick={() => setOpen(true)} style={{ padding: '2px 6px' }}>
        {isSmallDevice ? (
          <Icon fa="fa fa-history" />
        ) : (
          <>
            {!!wins && (
              <>
                <ThumbsUpIcon />
                {wins}
              </>
            )}
            {!!losses && (
              <>
                <ThumbsDownIcon style={{ marginLeft: wins ? 8 : 0 }} />
                {losses}
              </>
            )}
          </>
        )}
      </Button>
    );
  }

  const names = encounters.find(x => x.awayName && x.homeName) ?? encounters[0];
  return (
    <Modal size="lg" show onHide={() => setOpen(false)} centered style={{ zIndex: 100000 }}>
      <Modal.Header closeButton>
        <Modal.Title>
          {names?.homeName} vs {names?.awayName}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <EncountersTable encounters={encounters} ourPlayerUniqueIndex={ourPlayerUniqueIndex} />
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={() => setOpen(false)}>{t('common.close')}</Button>
      </Modal.Footer>
    </Modal>
  );
};

const EncountersTable = ({ encounters, ourPlayerUniqueIndex }: { encounters: PlayerEncounter[]; ourPlayerUniqueIndex: number }) => (
  <Table size="sm" striped>
    <thead>
      <tr>
        <th style={{ width: '30%' }}>{t('match.individual.matchTitle')}</th>
        <th style={{ width: '30%' }}>Thuis</th>
        <th style={{ width: '30%' }}>Bezoeker</th>
        <th style={{ width: '10%' }}>{t('match.individual.resultTitle')}</th>
      </tr>
    </thead>
    <tbody>
      {encounters.map(encounter => {
        const home = encounter.homePlayerUniqueId === ourPlayerUniqueIndex;
        const won = (home && encounter.homePlayerSets > encounter.awayPlayerSets) || (!home && encounter.awayPlayerSets > encounter.homePlayerSets);

        const date = dayjs(encounter.matchDate).format('D/M/YYYY');
        return (
          <tr key={encounter.matchId}>
            <td>
              {won && <TrophyIcon style={{ marginRight: 6 }} />}
              {encounter.competition} {date}
            </td>
            <td>
              {encounter.homeName.split(' ')[0]} <small>({encounter.homeRanking})</small>
            </td>
            <td>
              {encounter.awayName.split(' ')[0]} <small>({encounter.awayRanking})</small>
            </td>
            <td>
              {encounter.homePlayerSets}-{encounter.awayPlayerSets}
            </td>
          </tr>
        );
      })}
    </tbody>
  </Table>
);
