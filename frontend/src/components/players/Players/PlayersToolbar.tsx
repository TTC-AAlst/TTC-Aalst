import { Link } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { downloadPlayersExcel } from '../../../utils/httpClient';
import { SortDirection, SortIconDropDown } from '../../controls/Icons/SortIconDropDown';
import { ExcelButton } from '../../controls/Buttons/ExcelButton';
import { t } from '../../../locales';

type PlayersToolbarProps = {
  marginLeft: number;
  onFilterChange: Function;
  canSort: boolean;
  activeSort: string;
  activeSortDirection: SortDirection;
  onSortChange: Function;
  onSortDirectionChange: (dir: SortDirection) => void;
  myPlayerPageUrl?: string;
};

export const PlayersToolbar = ({
  marginLeft,
  onFilterChange,
  canSort,
  activeSort,
  activeSortDirection,
  onSortChange,
  onSortDirectionChange,
  myPlayerPageUrl,
}: PlayersToolbarProps) => {
  const sortConfig = [
    { key: 'name', text: t('player.sort.name') },
    { key: 'Vttl', text: t('player.sort.vttl') },
    { key: 'Sporta', text: t('player.sort.sporta') },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginRight: 5, marginLeft, marginBottom: 5 }}>
      <Form.Control placeholder={t('players.search')} onChange={e => onFilterChange(e.target.value.toLowerCase())} style={{ width: 150, marginTop: 8 }} />

      <div className="button-bar-right" style={{ marginTop: 5 }}>
        {myPlayerPageUrl && (
          <OverlayTrigger placement="top" overlay={<Tooltip id="my-player-page">{t('nav.myPlayerPage')}</Tooltip>}>
            <Link to={myPlayerPageUrl} className="btn btn-outline-secondary" aria-label={t('nav.myPlayerPage')}>
              <i className="fa fa-user fa-2x" />
            </Link>
          </OverlayTrigger>
        )}

        {canSort ? (
          <SortIconDropDown
            config={sortConfig}
            activeSort={activeSort}
            activeSortDirection={activeSortDirection}
            onSortChange={(newSort: string) => onSortChange(newSort)}
            onSortDirectionChange={newDir => onSortDirectionChange(newDir)}
          />
        ) : null}

        <ExcelButton
          onClick={() => downloadPlayersExcel(t('players.downloadExcelFileName'))}
          tooltip={t('players.downloadExcel')}
          className="btn-outline-secondary"
        />
      </div>
    </div>
  );
};
