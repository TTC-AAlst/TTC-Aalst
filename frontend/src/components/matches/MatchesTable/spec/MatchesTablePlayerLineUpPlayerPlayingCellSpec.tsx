import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../utils/test-utils';
import { MatchesTablePlayerLineUpPlayerPlayingCell } from '../MatchesTablePlayerLineUpCells';
import { IMatch, IPlayer, ITeam } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({ default: {} }));

const player = { id: 7, alias: 'Arne', getCompetition: () => ({ ranking: 'E0' }) } as unknown as IPlayer;
const team = { competition: 'Sporta' } as unknown as ITeam;
const match = { id: 5, block: 'Captain' } as unknown as IMatch;

const renderCell = (conflictTeams?: string[]) =>
  renderWithProviders(
    <table>
      <tbody>
        <tr>
          <MatchesTablePlayerLineUpPlayerPlayingCell display match={match} player={player} team={team} conflictTeams={conflictTeams} />
        </tr>
      </tbody>
    </table>,
  );

describe('MatchesTablePlayerLineUpPlayerPlayingCell', () => {
  it('turns red and warns when the player is picked elsewhere that week', async () => {
    renderCell(['Sporta B', 'Sporta C']);
    expect(screen.getByText('Arne').className).toContain('bg-danger');
    expect(document.querySelector('.fa-exclamation-triangle')).toBeInTheDocument();

    fireEvent.mouseOver(document.querySelector('.fa-exclamation-triangle')!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Speelt deze week ook in Sporta B, Sporta C');
  });

  it('keeps the thumbs up without a conflict', () => {
    renderCell();
    expect(screen.getByText('Arne').className).toContain('bg-success');
    expect(document.querySelector('.fa-thumbs-o-up')).toBeInTheDocument();
  });
});
