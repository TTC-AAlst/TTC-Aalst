import http from '../../../utils/httpClient';
import { IPlayerMembership, IVttlMember } from './membershipModels';

export const fetchMembership = (playerId: number) => http.get<IPlayerMembership>(`/membership/${playerId}`);

export const saveMembership = (membership: IPlayerMembership) => http.post<IPlayerMembership>('/membership', membership);

export const searchVttl = (name: string) => http.get<IVttlMember[]>('/membership/Vttl', { name });

interface IMembershipEmail {
  to: string[];
  cc: string[];
  subject: string;
  email: string;
  attachments: { fileName: string; base64: string }[];
}

export const sendMembershipEmail = (email: IMembershipEmail) => http.post<void>('/membership/Email', email);
