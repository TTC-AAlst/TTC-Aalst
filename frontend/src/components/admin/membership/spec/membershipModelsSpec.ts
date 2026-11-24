import { describe, it, expect } from 'vitest';
import {
  formatAddress,
  formatCity,
  getEmptyMembership,
  isMinor,
  isTransfer,
  IVttlMember,
  parseAddress,
  parseCity,
  suggestFormType,
  withContactAddress,
  frenoySeasonToText,
} from '../membershipModels';

const member = (season: number, club = 'OVL134'): IVttlMember => ({
  uniqueIndex: 1,
  firstName: 'JAN',
  lastName: 'PEETERS',
  ranking: 'E6',
  club,
  gender: 'M',
  birthDate: null,
  season,
});

describe('suggestFormType', () => {
  it('is a first affiliation when not found in VTTL', () => {
    expect(suggestFormType(null, 27, 'OVL134')).toBe('first');
  });

  it('is a renewal when with us last season', () => {
    expect(suggestFormType(member(26), 27, 'OVL134')).toBe('renewal');
  });

  it('is a reaffiliation after a gap of at least one season', () => {
    expect(suggestFormType(member(25), 27, 'OVL134')).toBe('reaffiliation');
    expect(suggestFormType(member(22, 'OVL001'), 27, 'OVL134')).toBe('reaffiliation');
  });

  it('flags a transfer from another club last season', () => {
    expect(isTransfer(member(27, 'OVL001'), 27, 'OVL134')).toBe(true);
    expect(isTransfer(member(25, 'OVL001'), 27, 'OVL134')).toBe(false);
    expect(isTransfer(member(27), 27, 'OVL134')).toBe(false);
  });
});

describe('frenoySeasonToText', () => {
  it('converts the frenoy season', () => {
    expect(frenoySeasonToText(27)).toBe('2026-2027');
  });
});

describe('address', () => {
  it.each([
    ['Kerkstraat 12', { street: 'Kerkstraat', houseNumber: '12', bus: '' }],
    ['Kerkstraat 12 bus 3', { street: 'Kerkstraat', houseNumber: '12', bus: '3' }],
    ['Sint-Jozefstraat 4A', { street: 'Sint-Jozefstraat', houseNumber: '4A', bus: '' }],
    ['Kerkstraat 12/3', { street: 'Kerkstraat', houseNumber: '12', bus: '3' }],
    ['Onbekend', { street: 'Onbekend', houseNumber: '', bus: '' }],
  ])('parses %s', (address, expected) => {
    expect(parseAddress(address)).toEqual(expected);
  });

  it('parses the city', () => {
    expect(parseCity('9300 Aalst')).toEqual({ postalCode: '9300', town: 'Aalst' });
    expect(parseCity('Aalst')).toEqual({ postalCode: '', town: 'Aalst' });
  });

  it('formats like the backend', () => {
    expect(formatAddress({ street: 'Kerkstraat', houseNumber: '12', bus: '3' })).toBe('Kerkstraat 12 bus 3');
    expect(formatAddress({ street: 'Kerkstraat', houseNumber: '12', bus: null })).toBe('Kerkstraat 12');
    expect(formatCity({ postalCode: '9300', town: 'Aalst' })).toBe('9300 Aalst');
  });

  it('prefills from the player contact without overwriting', () => {
    const prefilled = withContactAddress(getEmptyMembership(), 'Kerkstraat 12', '9300 Aalst');
    expect(prefilled.street).toBe('Kerkstraat');
    expect(prefilled.town).toBe('Aalst');

    const kept = withContactAddress({ ...getEmptyMembership(), street: 'Molenstraat', town: 'Erembodegem' }, 'Kerkstraat 12', '9300 Aalst');
    expect(kept.street).toBe('Molenstraat');
    expect(kept.town).toBe('Erembodegem');
  });
});

describe('isMinor', () => {
  it('is a minor until the 18th birthday', () => {
    const at = new Date(2026, 10, 24);
    expect(isMinor('2008-11-25', at)).toBe(true);
    expect(isMinor('2008-11-24', at)).toBe(false);
    expect(isMinor(null, at)).toBe(false);
  });
});
