import { render } from '@testing-library/react';
import { SetScores } from '../SetScores';
import { parseSetScores } from '../../../../models/utils/setScores';

const sets = parseSetScores('1|-9,2|8,3|5,4|13');

describe('SetScores', () => {
  it('shows every set of the game', () => {
    const { container } = render(<SetScores sets={sets} />);
    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['9-11', '11-8', '11-5', '15-13']);
  });

  it('marks the sets the home player won', () => {
    const { container } = render(<SetScores sets={sets} />);
    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.className.includes('set-score-won'))).toEqual([false, true, true, true]);
  });

  it('turns the sets around for a player playing away', () => {
    const { container } = render(<SetScores sets={sets} flip />);
    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.textContent)).toEqual(['11-9', '8-11', '5-11', '13-15']);
    expect(Array.from(container.querySelectorAll('.set-score')).map(x => x.className.includes('set-score-won'))).toEqual([true, false, false, false]);
  });

  it('renders nothing for a game without set scores', () => {
    const { container } = render(<SetScores sets={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
