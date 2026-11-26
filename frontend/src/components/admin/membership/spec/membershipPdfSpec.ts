import { describe, it, expect } from 'vitest';
import first from '../../../../../public/vttl/eerste-aansluiting.pdf?inline';
import reaffiliation from '../../../../../public/vttl/heraansluiting.pdf?inline';
import renewal from '../../../../../public/vttl/hernieuwing.pdf?inline';
import { PDFDocument } from 'pdf-lib';
import { fillPdf, getAgeCategory, getPdfFieldValues, IMembershipPdfData, toBase64 } from '../membershipPdf';
import { getEmptyMembership, MembershipFormType } from '../membershipModels';

const templates: Record<MembershipFormType, string> = { first, reaffiliation, renewal };
const template = (formType: MembershipFormType) => Uint8Array.from(atob(templates[formType].split(',')[1]!), c => c.charCodeAt(0));

const data = (formType: MembershipFormType): IMembershipPdfData => ({
  formType,
  firstName: 'Jan',
  lastName: 'Peeters',
  email: 'Jan@Example.be',
  mobile: '0470 12 34 56',
  vttlUniqueIndex: 512345,
  membership: {
    ...getEmptyMembership(1),
    status: 'Recreational',
    birthDate: '1990-05-17T00:00:00',
    gender: 'M',
    street: 'Kerkstraat',
    houseNumber: '12',
    postalCode: '9300',
    town: 'Aalst',
    otherFederation: 'Sporta',
    lastVttlSeason: '2022-2023',
  },
  clubName: 'TTC Aalst',
  clubNr: 'OVL134',
  chairman: 'Piet Voorzitter',
  secretary: 'Mie Secretaris',
  date: '24/11/2026',
  seasonYear: 2026,
});

describe('getAgeCategory', () => {
  it.each([
    [2018, 'Benjamin'],
    [2017, 'Preminiem'],
    [2014, 'Miniem'],
    [2012, 'Cadet'],
    [2009, 'Junior'],
    [2007, '-19'],
    [2006, 'Senior'],
    [1987, 'Senior'],
    [1986, 'Veteraan'],
  ])('born %i is %s in 2026-2027', (year, category) => {
    expect(getAgeCategory(year, 2026)).toBe(category);
  });
});

describe('getPdfFieldValues', () => {
  it('fills a first affiliation in capitals and keeps emails lowercase', () => {
    const values = getPdfFieldValues(data('first'));
    expect(values.text.NAAM).toBe('PEETERS');
    expect(values.text.STRAAT).toBe('KERKSTRAAT');
    expect(values.text.EMAIL).toBe('jan@example.be');
    expect(values.text.Datum_af_date).toBe('17/05/1990');
    expect(values.text.Text1).toBe('SPORTA');
    expect(values.text.Naam).toBe('PIET VOORZITTER');
    expect(values.text.Naam_3).toBe('MIE SECRETARIS');
    expect(values.checked).toEqual(['Check Box11', 'Check Box7']);
  });

  it('fills the last VTTL season on a reaffiliation', () => {
    const values = getPdfFieldValues({ ...data('reaffiliation'), membership: { ...data('reaffiliation').membership, status: 'Administrative' } });
    expect(values.text['Uw klassement bij je vorige club in de VTTL']).toBe('2022-2023');
    expect(values.text.LAND).toBe('SPORTA');
    expect(values.checked).toContain('Check Box10');
  });

  it('fills the member number on a renewal', () => {
    const values = getPdfFieldValues(data('renewal'));
    expect(values.text.LIDNUMMER).toBe('512345');
    expect(values.text['Naam voorzitter']).toBe('PIET VOORZITTER');
    expect(values.checked).toEqual(['Optie 3']);
  });
});

describe('fillPdf', () => {
  it.each<MembershipFormType>(['first', 'reaffiliation', 'renewal'])('fills the real %s template', async formType => {
    const bytes = await fillPdf(template(formType), getPdfFieldValues(data(formType)));

    const form = (await PDFDocument.load(bytes)).getForm();
    expect(form.getTextField('NAAM').getText()).toBe('PEETERS');
    const expected = getPdfFieldValues(data(formType)).checked;
    expected.forEach(name => expect(form.getCheckBox(name).isChecked()).toBe(true));
  });
});

describe('toBase64', () => {
  it('encodes bytes', () => {
    expect(toBase64(new TextEncoder().encode('%PDF'))).toBe('JVBERg==');
  });
});
