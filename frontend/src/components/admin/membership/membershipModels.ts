export type MembershipStatus = 'Competitive' | 'Administrative' | 'Recreational' | 'RecreantReserve' | 'LeisureCompetition';

export type MembershipFormType = 'first' | 'reaffiliation' | 'renewal';

export interface IPlayerMembership {
  playerId: number;
  /** Neither VTTL nor Sporta: recreant, only a member of the club */
  vttl: boolean;
  sporta: boolean;
  /** VTTL statuut */
  status: MembershipStatus;
  birthDate: string | null;
  gender: 'M' | 'V' | null;
  nationality: string | null;
  residentInBelgiumSince: string | null;
  street: string | null;
  houseNumber: string | null;
  bus: string | null;
  postalCode: string | null;
  town: string | null;
  phone: string | null;
  gSporter: boolean;
  parentEmail1: string | null;
  parentEmail2: string | null;
  otherFederationRanking: string | null;
  otherFederation: string | null;
  lastVttlSeason: string | null;
}

export interface IVttlMember {
  uniqueIndex: number;
  firstName: string;
  lastName: string;
  ranking: string;
  club: string;
  gender: 'M' | 'V' | null;
  birthDate: string | null;
  /** Frenoy season: 27 = 2026-2027 */
  season: number;
}

export const membershipStatuses: { key: MembershipStatus; text: string; forms: MembershipFormType[] }[] = [
  { key: 'Competitive', text: 'Competitief lid', forms: ['first', 'reaffiliation', 'renewal'] },
  { key: 'Administrative', text: 'Administratief lid', forms: ['reaffiliation'] },
  { key: 'Recreational', text: 'Recreatief lid', forms: ['first', 'reaffiliation', 'renewal'] },
  { key: 'RecreantReserve', text: 'Recreant-reserve', forms: ['first', 'reaffiliation', 'renewal'] },
  { key: 'LeisureCompetition', text: 'Vrijetijdscompetitie', forms: ['first', 'reaffiliation', 'renewal'] },
];

export const membershipForms: { key: MembershipFormType; text: string; file: string }[] = [
  { key: 'first', text: 'Eerste aansluiting', file: 'eerste-aansluiting.pdf' },
  { key: 'reaffiliation', text: 'Heraansluiting (min. 1 jaar onderbreking)', file: 'heraansluiting.pdf' },
  { key: 'renewal', text: 'Hernieuwing', file: 'hernieuwing.pdf' },
];

export const isRecreant = (m: Pick<IPlayerMembership, 'vttl' | 'sporta'>): boolean => !m.vttl && !m.sporta;

export const competitionText = (m: Pick<IPlayerMembership, 'vttl' | 'sporta'>): string => {
  if (m.vttl && m.sporta) return 'VTTL + Sporta';
  if (m.vttl) return 'VTTL';
  if (m.sporta) return 'Sporta';
  return 'Recreant';
};

export const getEmptyMembership = (playerId = 0): IPlayerMembership => ({
  playerId,
  vttl: true,
  sporta: false,
  status: 'Competitive',
  birthDate: null,
  gender: null,
  nationality: 'BELG',
  residentInBelgiumSince: null,
  street: null,
  houseNumber: null,
  bus: null,
  postalCode: null,
  town: null,
  phone: null,
  gSporter: false,
  parentEmail1: null,
  parentEmail2: null,
  otherFederationRanking: null,
  otherFederation: null,
  lastVttlSeason: null,
});

/** Frenoy season 27 => "2026-2027" */
export const frenoySeasonToText = (season: number): string => `${season + 1999}-${season + 2000}`;

const isRecentlyAffiliated = (member: IVttlMember, currentFrenoySeason: number): boolean => member.season >= currentFrenoySeason - 1;

/**
 * Suggest the VTTL form from a VTTL search hit.
 * With us this or last season => renewal,
 * a gap of at least one season => reaffiliation.
 */
export function suggestFormType(member: IVttlMember | null, currentFrenoySeason: number, ownClubCode: string): MembershipFormType {
  if (!member) {
    return 'first';
  }
  if (isRecentlyAffiliated(member, currentFrenoySeason)) {
    return member.club === ownClubCode ? 'renewal' : 'reaffiliation';
  }
  return 'reaffiliation';
}

/** Affiliated with another club last season: that's a transfer, not covered by these forms */
export const isTransfer = (member: IVttlMember, currentFrenoySeason: number, ownClubCode: string): boolean =>
  isRecentlyAffiliated(member, currentFrenoySeason) && member.club !== ownClubCode;

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Player.Contact.Address "Kerkstraat 12 bus 3" => street, number, bus */
export function parseAddress(address: string): { street: string; houseNumber: string; bus: string } {
  const match = address.trim().match(/^(.*?)[\s,]+(\d+[a-zA-Z]?)(?:\s*(?:bus|\/)\s*(\S+))?$/i);
  if (!match) {
    return { street: address.trim(), houseNumber: '', bus: '' };
  }
  return { street: match[1] ?? '', houseNumber: match[2] ?? '', bus: match[3] ?? '' };
}

/** Player.Contact.City "9300 Aalst" => postal code, town */
export function parseCity(city: string): { postalCode: string; town: string } {
  const match = city.trim().match(/^(\d{4})\s+(.+)$/);
  return match ? { postalCode: match[1] ?? '', town: match[2] ?? '' } : { postalCode: '', town: city.trim() };
}

/** Same format as MembershipService.SyncContact in the backend */
export function formatAddress(m: Pick<IPlayerMembership, 'street' | 'houseNumber' | 'bus'>): string {
  const bus = m.bus?.trim() ? ` bus ${m.bus.trim()}` : '';
  return `${m.street?.trim() ?? ''} ${m.houseNumber?.trim() ?? ''}`.trim() + bus;
}

export const formatCity = (m: Pick<IPlayerMembership, 'postalCode' | 'town'>): string => `${m.postalCode?.trim() ?? ''} ${m.town?.trim() ?? ''}`.trim();

/** Prefill the split address fields from the address we already have on the player */
export function withContactAddress(membership: IPlayerMembership, address: string, city: string): IPlayerMembership {
  const result = { ...membership };
  if (!result.street && address) {
    const parsed = parseAddress(address);
    result.street = parsed.street;
    result.houseNumber = parsed.houseNumber;
    result.bus = parsed.bus;
  }
  if (!result.town && city) {
    const parsed = parseCity(city);
    result.postalCode = parsed.postalCode;
    result.town = parsed.town;
  }
  return result;
}

export const isMinor = (birthDate: string | null, at: Date = new Date()): boolean => {
  if (!birthDate) {
    return false;
  }
  const birth = new Date(birthDate);
  const eighteenth = new Date(birth.getFullYear() + 18, birth.getMonth(), birth.getDate());
  return eighteenth > at;
};
