import { render } from '@testing-library/react';
import { PercentageLabel } from '../PercentageLabel';

describe('PercentageLabel', () => {
  it('renders nothing without games', () => {
    const { container } = render(<PercentageLabel won={0} lost={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a plain percentage by default', () => {
    const { container } = render(<PercentageLabel won={1} lost={4} />);
    expect(container.textContent).toBe('20%');
    expect(container.querySelector('span')).toBeNull();
  });

  it('honours decimals', () => {
    const { container } = render(<PercentageLabel won={3} lost={4} decimals={2} />);
    expect(container.textContent).toBe('42,86%');
  });

  it('paints the percentage when asked', () => {
    const { container } = render(<PercentageLabel won={1} lost={4} heat />);
    const pill = container.querySelector('span');
    expect(pill).not.toBeNull();
    expect(pill!.style.backgroundColor).toBe('rgb(217, 83, 79)');
    expect(pill!.style.color).toBe('#333');
  });

  it('mutes the paint on a small sample', () => {
    const { container } = render(<PercentageLabel won={2} lost={0} heat />);
    expect(container.querySelector('span')!.style.backgroundColor).toBe('rgb(116, 150, 117)');
  });

  it('still reads as the same number when painted', () => {
    const { container } = render(<PercentageLabel won={1} lost={4} heat />);
    expect(container.textContent).toBe('20%');
  });
});
