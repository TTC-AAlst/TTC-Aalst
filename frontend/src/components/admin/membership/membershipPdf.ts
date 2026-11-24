import dayjs from 'dayjs';
import { PDFDocument } from 'pdf-lib';
import { IPlayerMembership, MembershipFormType, MembershipStatus, membershipForms } from './membershipModels';

export interface IMembershipPdfData {
  formType: MembershipFormType;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  vttlUniqueIndex: number | null;
  membership: IPlayerMembership;
  clubName: string;
  clubNr: string;
  chairman: string;
  secretary: string;
  /** dd/MM/yyyy */
  date: string;
  /** Start year of the season the form is for (2026 for 2026-2027) */
  seasonYear: number;
}

interface IPdfFieldValues {
  text: Record<string, string>;
  checked: string[];
}

type AgeCategory = 'Benjamin' | 'Preminiem' | 'Miniem' | 'Cadet' | 'Junior' | '-19' | 'Senior' | 'Veteraan';

/** VTTL age categories: for season 2026-2027 a Benjamin is born in 2018 or later */
export function getAgeCategory(birthYear: number, seasonYear: number): AgeCategory {
  const age = seasonYear - birthYear;
  if (age <= 8) return 'Benjamin';
  if (age <= 10) return 'Preminiem';
  if (age <= 12) return 'Miniem';
  if (age <= 14) return 'Cadet';
  if (age <= 17) return 'Junior';
  if (age <= 19) return '-19';
  if (age <= 39) return 'Senior';
  return 'Veteraan';
}

const ageCategoryCheckboxes: Record<AgeCategory, string> = {
  Benjamin: 'Check Box1',
  Preminiem: 'Check Box2',
  Miniem: 'Check Box3',
  Cadet: 'Check Box4',
  Junior: 'Check Box5',
  '-19': 'Check Box6',
  Senior: 'Check Box7',
  Veteraan: 'Check Box8',
};

const statusCheckboxes: Record<MembershipFormType, Partial<Record<MembershipStatus, string>>> = {
  first: {
    Competitive: 'Check Box10',
    Recreational: 'Check Box11',
    RecreantReserve: 'Check Box12',
    LeisureCompetition: 'Check Box13',
  },
  reaffiliation: {
    Competitive: 'Check Box9',
    Administrative: 'Check Box10',
    Recreational: 'Check Box11',
    RecreantReserve: 'Check Box12',
    LeisureCompetition: 'Check Box13',
  },
  renewal: {
    Competitive: 'Optie 1',
    RecreantReserve: 'Optie 2',
    Recreational: 'Optie 3',
    LeisureCompetition: 'Optie 4',
  },
};

const upper = (value: string | null | undefined): string => (value ?? '').trim().toUpperCase();
const lower = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

export function getPdfFieldValues(data: IMembershipPdfData): IPdfFieldValues {
  const m = data.membership;
  const checked: string[] = [];
  const statusBox = statusCheckboxes[data.formType][m.status];
  if (statusBox) {
    checked.push(statusBox);
  }

  if (data.formType === 'renewal') {
    return {
      checked,
      text: {
        NAAM: upper(data.lastName),
        VOORNAAM: upper(data.firstName),
        CLUB: upper(`${data.clubName} (${data.clubNr})`),
        LIDNUMMER: data.vttlUniqueIndex ? String(data.vttlUniqueIndex) : '',
        Datum_af_date: data.date,
        'Naam voorzitter': upper(data.chairman),
        'Naam secretaris': upper(data.secretary),
      },
    };
  }

  const birthDate = m.birthDate ? dayjs(m.birthDate) : null;
  if (birthDate) {
    checked.push(ageCategoryCheckboxes[getAgeCategory(birthDate.year(), data.seasonYear)]);
  }

  const text: Record<string, string> = {
    CLUBNAAM: upper(data.clubName),
    CLUBNR: upper(data.clubNr),
    'Uw klassement in een ander verbondland': upper(m.otherFederationRanking),
    NAAM: upper(data.lastName),
    VOORNAAM: upper(data.firstName),
    STRAAT: upper(m.street),
    NR: upper(m.houseNumber),
    BUS: upper(m.bus),
    POSTCODE: upper(m.postalCode),
    GEMEENTE: upper(m.town),
    NATIONALITEIT: upper(m.nationality),
    'SPELER MET VREEMDE NATIONALITEIT SINDS WANNEER VERBLIJFT U IN BELGIE': upper(m.residentInBelgiumSince),
    Datum_af_date: birthDate ? birthDate.format('DD/MM/YYYY') : '',
    GESLACHT: m.gender ?? '',
    TELEFOON: upper(m.phone),
    EMAIL: lower(data.email),
    'GSM NR': upper(data.mobile),
    GSPORTER: m.gSporter ? 'JA' : 'NEE',
    'EMAIL OUDER': lower(m.parentEmail1),
    'EMAIL OUDER_2': lower(m.parentEmail2),
    Date1_af_date: data.date,
    Naam: upper(data.chairman),
    Naam_3: upper(data.secretary),
  };

  if (data.formType === 'first') {
    text.Text1 = upper(m.otherFederation);
  } else {
    text.LAND = upper(m.otherFederation);
    text['Uw klassement bij je vorige club in de VTTL'] = upper(m.lastVttlSeason);
  }

  return { text, checked };
}

const getPdfTemplateUrl = (formType: MembershipFormType): string => `/vttl/${membershipForms.find(f => f.key === formType)!.file}`;

export async function fillPdf(template: ArrayBuffer | Uint8Array, values: IPdfFieldValues): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(template);
  const form = pdf.getForm();
  Object.entries(values.text).forEach(([name, value]) => form.getTextField(name).setText(value));
  values.checked.forEach(name => form.getCheckBox(name).check());
  return pdf.save();
}

export async function createMembershipPdf(data: IMembershipPdfData): Promise<Uint8Array> {
  const response = await fetch(getPdfTemplateUrl(data.formType));
  const template = await response.arrayBuffer();
  return fillPdf(template, getPdfFieldValues(data));
}

export const getPdfFileName = (data: IMembershipPdfData): string => {
  const form = membershipForms.find(f => f.key === data.formType)!;
  return `${form.file.replace('.pdf', '')} ${data.seasonYear}-${data.seasonYear + 1} ${data.firstName} ${data.lastName}.pdf`;
};

export function downloadPdf(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.download = fileName;
  link.href = URL.createObjectURL(blob);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
