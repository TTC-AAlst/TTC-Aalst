import { useState } from 'react';
import dayjs from 'dayjs';
import { MemberSearch } from './MemberSearch';
import { MembershipForm, IMembershipFormState } from './MembershipForm';
import { IStorePlayer } from '../../../models/model-interfaces';
import { UserRoles } from '../../../models/UserModel';
import { useTtcSelector } from '../../../utils/hooks/storeHooks';
import { IVttlMember, frenoySeasonToText, getEmptyMembership, suggestFormType } from './membershipModels';
import { fetchMembership } from './membershipApi';

const getNewPlayer = (firstName = '', lastName = ''): IStorePlayer => ({
  alias: firstName,
  contact: { playerId: 0, email: '', mobile: '', address: '', city: '' },
  id: 0,
  active: true,
  firstName,
  lastName,
  sporta: undefined,
  vttl: undefined,
  style: { playerId: 0, name: '', bestStroke: '' },
  quitYear: null,
  security: 'Player' as UserRoles,
  hasKey: null,
  imageVersion: 0,
});

const titleCase = (value: string): string => value.toLowerCase().replace(/(^|[\s-])\S/g, x => x.toUpperCase());

/** "Jan Peeters" => Jan / Peeters, "Jan Van den Broeck" => Jan / Van den Broeck */
const splitName = (name: string): [string, string] => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return [first ?? '', rest.join(' ')];
};

export const useSeason = () => {
  const year = useTtcSelector(state => state.config.params.year);
  const seasonYear = Number(year) || dayjs().year();
  return { seasonYear, currentFrenoySeason: seasonYear - 2000 + 1 };
};

type AdminNewMemberProps = {
  onEnd: () => void;
};

export const AdminNewMember = ({ onEnd }: AdminNewMemberProps) => {
  const [form, setForm] = useState<IMembershipFormState | null>(null);
  const ownClubCode = useTtcSelector(state => state.config.params.frenoyClubIdVttl);
  const players = useTtcSelector(state => state.players);
  const quitters = useTtcSelector(state => state.playersQuitters);
  const { currentFrenoySeason } = useSeason();

  if (form) {
    return <MembershipForm initial={form} onEnd={onEnd} />;
  }

  const onPlayer = async (player: IStorePlayer) => {
    const membership = await fetchMembership(player.id);
    setForm({
      player,
      membership,
      formType: player.quitYear ? 'reaffiliation' : 'renewal',
      vttlUniqueIndex: player.vttl?.uniqueIndex || null,
    });
  };

  const onVttl = async (member: IVttlMember) => {
    const formType = suggestFormType(member, currentFrenoySeason, ownClubCode);
    const lastVttlSeason = formType === 'reaffiliation' ? frenoySeasonToText(member.season) : null;
    const known = players
      .concat(quitters)
      .find(
        p =>
          p.vttl?.uniqueIndex === member.uniqueIndex ||
          (p.firstName.toLowerCase() === member.firstName.toLowerCase() && p.lastName.toLowerCase() === member.lastName.toLowerCase()),
      );
    if (known) {
      const membership = await fetchMembership(known.id);
      setForm({
        player: known,
        membership: {
          ...membership,
          gender: membership.gender ?? member.gender,
          birthDate: membership.birthDate ?? member.birthDate,
          lastVttlSeason: membership.lastVttlSeason ?? lastVttlSeason,
        },
        formType,
        vttlUniqueIndex: member.uniqueIndex,
      });
      return;
    }

    setForm({
      player: getNewPlayer(titleCase(member.firstName), titleCase(member.lastName)),
      membership: {
        ...getEmptyMembership(),
        gender: member.gender,
        birthDate: member.birthDate,
        lastVttlSeason,
      },
      formType,
      vttlUniqueIndex: member.uniqueIndex,
    });
  };

  return (
    <div style={{ marginLeft: 10, marginRight: 10 }}>
      <MemberSearch
        currentFrenoySeason={currentFrenoySeason}
        ownClubCode={ownClubCode}
        onNew={name => setForm({ player: getNewPlayer(...splitName(name)), membership: getEmptyMembership(), formType: 'first', vttlUniqueIndex: null })}
        onPlayer={onPlayer}
        onVttl={onVttl}
      />
    </div>
  );
};
