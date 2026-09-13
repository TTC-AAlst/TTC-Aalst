import PlayerModel, { displayMobile, createFrenoyLink, createFrenoyLinkByUniqueId, getPlayingStatusClass } from '../PlayerModel';
import { IPlayerCompetition } from '../model-interfaces';

describe('PlayerModel', () => {
  it('constructs with defaults', () => {
    const player = new PlayerModel();
    expect(player.id).toBe(0);
    expect(player.alias).toBe('');
    expect(player.firstName).toBe('');
    expect(player.lastName).toBe('');
    expect(player.active).toBe(false);
    expect(player.security).toBe('Player');
    expect(player.hasKey).toBeNull();
    expect(player.quitYear).toBeNull();
    expect(player.imageVersion).toBe(0);
    expect(player.style).toEqual({ playerId: 0, name: '', bestStroke: '' });
  });

  it('constructs from json', () => {
    const player = new PlayerModel({
      id: 42,
      alias: 'Dirk',
      firstName: 'Dirk',
      lastName: 'De Smansen',
      active: true,
      security: 'Board',
      hasKey: true,
      quitYear: null,
      imageVersion: 3,
    });
    expect(player.id).toBe(42);
    expect(player.alias).toBe('Dirk');
    expect(player.active).toBe(true);
    expect(player.security).toBe('Board');
    expect(player.hasKey).toBe(true);
    expect(player.imageVersion).toBe(3);
  });

  it('computes name from firstName and lastName', () => {
    const player = new PlayerModel({ firstName: 'Dirk', lastName: 'De Smansen' });
    expect(player.name).toBe('Dirk De Smansen');
  });

  it('computes slug from name', () => {
    const player = new PlayerModel({ firstName: 'Dirk', lastName: 'De Smansen' });
    expect(player.slug).toBe('dirk-de-smansen');
  });

  it('getCompetition returns vttl for Vttl', () => {
    const vttl = { competition: 'Vttl', ranking: 'B4' } as IPlayerCompetition;
    const player = new PlayerModel({ vttl });
    expect(player.getCompetition('Vttl')).toBe(vttl);
  });

  it('getCompetition returns vttl for Jeugd', () => {
    const vttl = { competition: 'Vttl', ranking: 'C0' } as IPlayerCompetition;
    const player = new PlayerModel({ vttl });
    expect(player.getCompetition('Jeugd')).toBe(vttl);
  });

  it('getCompetition returns sporta for Sporta', () => {
    const sporta = { competition: 'Sporta', ranking: 'D2' } as IPlayerCompetition;
    const player = new PlayerModel({ sporta });
    expect(player.getCompetition('Sporta')).toBe(sporta);
  });

  it('getCompetition returns empty object when competition is missing', () => {
    const player = new PlayerModel();
    const result = player.getCompetition('Vttl');
    expect(result).toEqual({});
  });

  it('contact has getMobile method', () => {
    const player = new PlayerModel({
      contact: { playerId: 1, email: 'test@test.com', mobile: '0476123456', address: 'Street 1', city: 'Aalst' },
    });
    expect(displayMobile(player.contact.mobile)).toBe('0476/12 34 56');
  });
});

describe('displayMobile', () => {
  it('formats a 10-digit Belgian mobile number', () => {
    expect(displayMobile('0476123456')).toBe('0476/12 34 56');
  });

  it('formats a 9-digit number', () => {
    expect(displayMobile('053123456')).toBe('053/12 34 56');
  });

  it('returns empty string for falsy input', () => {
    expect(displayMobile('')).toBe('');
  });

  it('returns unformatted string if pattern does not match', () => {
    expect(displayMobile('123')).toBe('123');
  });
});

describe('createFrenoyLinkByUniqueId', () => {
  it('builds Vttl link', () => {
    expect(createFrenoyLinkByUniqueId('Vttl', 12345)).toBe('https://competitie.vttl.be/12345');
  });

  it('builds Jeugd link using Vttl domain', () => {
    expect(createFrenoyLinkByUniqueId('Jeugd', 999)).toBe('https://competitie.vttl.be/999');
  });

  it('builds Sporta link with zero-padded uniqueId', () => {
    expect(createFrenoyLinkByUniqueId('Sporta', 42)).toBe('https://ttonline.sporta.be/000042');
  });

  it('builds Sporta link with large uniqueId', () => {
    expect(createFrenoyLinkByUniqueId('Sporta', 123456)).toBe('https://ttonline.sporta.be/123456');
  });
});

describe('createFrenoyLink', () => {
  it('uses frenoyLink for Vttl when available', () => {
    const comp = { competition: 'Vttl', frenoyLink: 'ABC123', uniqueIndex: 99 } as IPlayerCompetition;
    expect(createFrenoyLink(comp)).toBe('https://competitie.vttl.be/?menu=6&result=1&sel=ABC123');
  });

  it('uses frenoyLink for Sporta when available', () => {
    const comp = { competition: 'Sporta', frenoyLink: 'XYZ', uniqueIndex: 99 } as IPlayerCompetition;
    expect(createFrenoyLink(comp)).toBe('https://ttonline.sporta.be/?menu=6&result=1&sel=XYZ');
  });

  it('falls back to uniqueId when frenoyLink is empty', () => {
    const comp = { competition: 'Vttl', frenoyLink: '', uniqueIndex: 42 } as IPlayerCompetition;
    expect(createFrenoyLink(comp)).toBe('https://competitie.vttl.be/42');
  });
});

describe('getPlayingStatusClass', () => {
  it('returns success for Play', () => {
    expect(getPlayingStatusClass('Play')).toBe('success');
  });

  it('returns success for Major', () => {
    expect(getPlayingStatusClass('Major')).toBe('success');
  });

  it('returns warning for Captain', () => {
    expect(getPlayingStatusClass('Captain')).toBe('warning');
  });

  it('returns danger for NotPlay', () => {
    expect(getPlayingStatusClass('NotPlay')).toBe('danger');
  });

  it('returns info for Maybe', () => {
    expect(getPlayingStatusClass('Maybe')).toBe('info');
  });

  it('returns secondary for DontKnow', () => {
    expect(getPlayingStatusClass('DontKnow')).toBe('secondary');
  });

  it('returns undefined for empty string', () => {
    expect(getPlayingStatusClass('')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(getPlayingStatusClass(undefined)).toBeUndefined();
  });
});
