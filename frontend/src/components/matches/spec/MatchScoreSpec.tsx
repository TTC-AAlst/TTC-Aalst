import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../utils/test-utils';
import { MatchScore } from '../MatchScore';
import { IMatch } from '../../../models/model-interfaces';

vi.mock('../../../storeUtil', () => ({ default: {} }));

const woMatch = (overrides: Partial<IMatch> = {}): IMatch =>
  ({
    id: 1,
    scoreType: 'WalkOver',
    score: { home: 0, out: 0 },
    isDerby: false,
    isHomeMatch: true,
    comments: [],
    description: '',
    getPreviousMatch: () => null,
    ...overrides,
  }) as unknown as IMatch;

const render = (match: IMatch, forceDisplay = false) =>
  renderWithProviders(
    <TestRouter>
      <MatchScore match={match} forceDisplay={forceDisplay} noLink />
    </TestRouter>,
  );

describe('MatchScore — walkover', () => {
  it('shows a "WO" badge instead of 0 - 0 (forceDisplay, e.g. match detail header)', () => {
    render(woMatch(), true);
    const badge = screen.getByText('WO');
    expect(badge).toBeInTheDocument();
    expect(screen.queryByText('0 - 0')).not.toBeInTheDocument();
    // Must carry a background class — a bare label-as-badge is invisible on the row background.
    expect(badge.classList.contains('match-wo')).toBe(true);
  });

  it('shows "WO" without forceDisplay (does not fall back to the previous encounter)', () => {
    render(woMatch());
    expect(screen.getByText('WO')).toBeInTheDocument();
  });
});

describe('MatchScore — derby', () => {
  const derby = (isHomeMatch: boolean) => woMatch({ scoreType: isHomeMatch ? 'Won' : 'Lost', score: { home: 10, out: 0 }, isDerby: true, isHomeMatch });

  it('is won for the team that won it', () => {
    render(derby(true), true);
    expect(screen.getByText('10 - 0').closest('.label-as-badge')!.classList.contains('match-won')).toBe(true);
  });

  it('is lost for the team that lost it', () => {
    render(derby(false), true);
    expect(screen.getByText('10 - 0').closest('.label-as-badge')!.classList.contains('match-lost')).toBe(true);
  });
});
