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
    const html = buildMembershipEmail('Jan', 'first', params, 'Bestuur');
    expect(html).toContain('Dag Jan');
    expect(html).toContain('€125 voor volwassenen');
    expect(html).toContain('Training: dinsdag 19u');
    expect(html).toContain('BE55 0016 5927 6744');
    expect(html).toContain('Welkom bij TTC Aalst');
  });

  it('escapes html and skips empty params', () => {
    const html = buildMembershipEmail('<b>Jan</b>', 'renewal', params, 'Bestuur');
    expect(html).toContain('&lt;b&gt;Jan&lt;/b&gt;');
    expect(html).toContain('Sportzaal &lt;Aalst&gt;');
    expect(html).not.toContain('<br><br>');
    expect(html).toContain('verlengen');
  });
});
