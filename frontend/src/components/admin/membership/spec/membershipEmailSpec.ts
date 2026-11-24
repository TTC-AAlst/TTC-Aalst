import { describe, it, expect } from 'vitest';
import { buildMembershipEmail, IMembershipEmailParams } from '../membershipEmail';

const params: IMembershipEmailParams = {
  location: 'Sportzaal <Aalst>',
  competitionDays: 'Competitie: vrijdag',
  trainingDays: 'Training: dinsdag 19u',
  trainingDays2: '',
  trainingDays3: '',
  trainingDays4: '',
  adultMembership: '€125 voor volwassenen',
  youthMembership: '€75 voor jeugd',
  recreationalMembers: '€75 voor recreanten',
  additionalMembership: '',
  clubBankNr: 'BE55 0016 5927 6744',
};

describe('buildMembershipEmail', () => {
  it('contains prices, training and iban', () => {
    const html = buildMembershipEmail('Jan', 'first', ['VTTL'], params, 'Bestuur');
    expect(html).toContain('Dag Jan');
    expect(html).toContain('€125 voor volwassenen');
    expect(html).toContain('Training: dinsdag 19u');
    expect(html).toContain('BE55 0016 5927 6744');
    expect(html).toContain('Welkom bij TTC Aalst');
    expect(html).toContain('aansluitingsformulier voor VTTL');
  });

  it('mentions both forms for VTTL + Sporta', () => {
    const html = buildMembershipEmail('Jan', 'first', ['VTTL', 'Sporta'], params, 'Bestuur');
    expect(html).toContain('aansluitingsformulieren voor VTTL en Sporta');
  });

  it('has no attachment paragraph for a recreant', () => {
    const html = buildMembershipEmail('Jan', null, [], params, 'Bestuur');
    expect(html).toContain('Welkom bij TTC Aalst');
    expect(html).not.toContain('In bijlage');
    expect(html).toContain('€75 voor recreanten');
  });

  it('escapes html and skips empty params', () => {
    const html = buildMembershipEmail('<b>Jan</b>', 'renewal', ['VTTL'], params, 'Bestuur');
    expect(html).toContain('&lt;b&gt;Jan&lt;/b&gt;');
    expect(html).toContain('Sportzaal &lt;Aalst&gt;');
    expect(html).not.toContain('<br><br>');
    expect(html).toContain('verlengen');
  });
});
