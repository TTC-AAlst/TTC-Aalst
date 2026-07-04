import { logger } from './logger';
import { EetfestijnModel } from '../components/admin/EetfestijnModel';

export function parseEvents(json: string): string[] {
  if (!json) {
    return [];
  }

  try {
    return JSON.parse(json);
  } catch (err: unknown) {
    logger.error(`parseEvents: ${err instanceof Error ? err.message : String(err)}`, { stack: JSON.stringify(err), raw: json });
    return [];
  }
}

export function parseEetfestijn(json: string): EetfestijnModel {
  if (!json) {
    return defaultEetfestijn;
  }

  try {
    return JSON.parse(json);
  } catch (err: unknown) {
    logger.error(`parseEetfestijn: ${err instanceof Error ? err.message : String(err)}`, { stack: JSON.stringify(err), raw: json });
    return defaultEetfestijn;
  }
}

const defaultEetfestijn: EetfestijnModel = {
  show: false,
  date: '2025-10-25',
  hour: {
    from: '17:30',
    to: '22:00',
  },
  venue: {
    name: 'Sint-Paulus',
    address: 'Botermelkstraat 63, 9300 Aalst',
    mapsUrl:
      'https://maps.google.com/maps?q=Botermelkstraat+63,+9300+Aalst&hl=en&ll=50.953115,4.061058&spn=0.009449,0.023475&sll=50.952442,4.062345&sspn=0.001188,0.002934&t=m&hnear=Botermelkstraat+63,+Aalst+9300+Aalst,+Oost-Vlaanderen,+Vlaams+Gewest,+Belgium&z=16',
  },
  menu: [
    { name: 'Vegetarische pasta', desc: '', price: 20 },
    { name: 'Vispannetje', desc: '', price: 20 },
    { name: 'Vol-au-vent', desc: 'met koude groenten en frietjes', price: 20 },
    { name: 'Balletjes in tomatensaus', desc: 'met koude groeten en frietjes', price: 20 },
    { name: 'Varkenshaasje', desc: 'met koude groentjes, warme sauzen en frietjes', price: 20 },
  ],
  steunkaart: 2.5,
};
