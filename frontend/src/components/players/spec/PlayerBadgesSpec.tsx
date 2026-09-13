import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../utils/test-utils';
import { PlayerCompetitionBadge, PlayerCompetitionButton } from '../PlayerBadges';
import { MatchPlayerStatus, PickedPlayer } from '../../../models/model-interfaces';

vi.mock('../../../storeUtil', () => ({ default: {} }));

const plyInfo = (status: MatchPlayerStatus | '') =>
  ({
    id: 1,
    matchId: 1,
    player: { id: 1, alias: 'Wouter', getCompetition: () => undefined },
    matchPlayer: { status, statusNote: '' },
  }) as unknown as PickedPlayer;

const renderButton = (status: MatchPlayerStatus | '') =>
  renderWithProviders(
    <TestRouter>
      <PlayerCompetitionButton plyInfo={plyInfo(status)} isPicked={false} actionIconClass="fa fa-trash-o" onButtonClick={() => {}} competition="Vttl" />
    </TestRouter>,
  );

describe('PlayerCompetitionButton', () => {
  it('gives DontKnow its own color', () => {
    renderButton('DontKnow');
    expect(screen.getByRole('button').className).toContain('btn-secondary');
  });

  it('leaves a player without a decision uncolored', () => {
    renderButton('');
    expect(screen.getByRole('button').className).toContain('btn-outline-primary');
  });

  it('does not color DontKnow like Misschien', () => {
    renderButton('Maybe');
    expect(screen.getByRole('button').className).toContain('btn-info');
  });
});

describe('PlayerCompetitionBadge', () => {
  it('gives DontKnow its own color', () => {
    renderWithProviders(
      <TestRouter>
        <PlayerCompetitionBadge plyInfo={plyInfo('DontKnow') as never} competition="Vttl" />
      </TestRouter>,
    );
    expect(screen.getByText('Wouter').className).toContain('bg-secondary');
  });
});
