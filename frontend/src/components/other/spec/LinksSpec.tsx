import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Links from '../Links';

describe('Links', () => {
  it('links to Tournooike', () => {
    render(<Links />);
    expect(screen.getByRole('link', { name: 'Tournooike (Clubtoernooien)' })).toHaveAttribute('href', 'https://tournooike.ttc-aalst.be');
  });
});
