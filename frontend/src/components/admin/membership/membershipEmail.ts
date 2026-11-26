import { MembershipFormType } from './membershipModels';

export interface IMembershipEmailParams {
  location: string;
  competitionDays: string;
  trainingDays: string;
  trainingDays2: string;
  trainingDays3: string;
  trainingDays4: string;
  adultMembership: string;
  youthMembership: string;
  recreationalMembers: string;
  additionalMembership: string;
  clubBankNr: string;
}

const recreantIntro = 'Welkom bij TTC Aalst! Fijn dat je bij ons komt tafeltennissen.';

const intros: Record<MembershipFormType, string> = {
  first: 'Welkom bij TTC Aalst! Fijn dat je bij ons komt tafeltennissen.',
  reaffiliation: 'Welkom terug bij TTC Aalst! Fijn dat je opnieuw bij ons komt tafeltennissen.',
  renewal: 'Bedankt om je lidmaatschap bij TTC Aalst te verlengen!',
};

const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const lines = (values: string[]): string =>
  values
    .filter(x => x && x.trim())
    .map(x => escape(x.trim()))
    .join('<br>');

/**
 * @param formType The VTTL form, null when not affiliating with VTTL
 * @param attachments Federation names of the attached forms
 */
export function buildMembershipEmail(
  firstName: string,
  formType: MembershipFormType | null,
  attachments: string[],
  params: IMembershipEmailParams,
  signature: string,
): string {
  let html = `<p>Dag ${escape(firstName)},</p>`;
  html += `<p>${formType ? intros[formType] : recreantIntro}</p>`;
  if (attachments.length) {
    const forms = attachments.length === 1 ? `je aansluitingsformulier voor ${attachments[0]}` : `je aansluitingsformulieren voor ${attachments.join(' en ')}`;
    html += `<p>In bijlage vind je ${forms}, al ingevuld en ondertekend door het bestuur. `;
    html += 'Kijk je gegevens even na, vul aan waar nodig, onderteken en bezorg het ons terug.</p>';
  }

  html += '<p><b>Lidgeld</b><br>';
  html += lines([params.adultMembership, params.youthMembership, params.recreationalMembers]);
  html += '</p>';
  if (params.additionalMembership?.trim()) {
    html += `<p>${lines([params.additionalMembership])}</p>`;
  }
  html += `<p>Je mag het lidgeld overschrijven op <b>${escape(params.clubBankNr)}</b> met vermelding van "Lidgeld" en je naam.</p>`;

  html += '<p><b>Wanneer kan je komen spelen?</b><br>';
  html += lines([params.competitionDays, params.trainingDays, params.trainingDays2, params.trainingDays3, params.trainingDays4]);
  html += '</p>';
  if (params.location?.trim()) {
    html += `<p><b>Waar?</b><br>${lines([params.location])}</p>`;
  }

  html += '<p>Tot binnenkort aan de tafel!</p>';
  html += `<p>Sportieve groeten,<br>${escape(signature)}</p>`;
  return html;
}
