import { OwnEmail } from '../controls/controls/Email';
import { GoogleMap } from '../controls/controls/GoogleMap';
import { t } from '../../locales';
import { useTtcSelector } from '../../utils/hooks/storeHooks';

export const GeneralInfo = () => {
  const params = useTtcSelector(state => state.config.params);

  return (
    <div style={{ marginTop: 10, marginBottom: 10 }}>
      <h1>{t('clubs.generalInfo.title')}</h1>
      <div className="row">
        <div className="col-md-6">
          <h2>{t('clubs.generalInfo.contact')}</h2>
          <strong>{t('clubs.generalInfo.ourAddress')}</strong> {params.location}
          <div>
            <strong>{t('clubs.generalInfo.ourEmail')}</strong> <OwnEmail />
          </div>
          <strong>{t('clubs.generalInfo.orgNr')}</strong> {params.clubOrgNr}
          <br />
          <h2>{t('clubs.generalInfo.openDays')}</h2>
          {params.competitionDays}
          <br />
          {params.trainingDays}
          <br />
          {params.trainingDays2}
          <br />
          {params.trainingDays3}
          <br />
          {params.trainingDays4}
          <br />
          {t('clubs.training.extra')}
          <br />
          <br />
          <strong>VTTL</strong> {params.frenoyClubIdVttl}
          <br />
          <strong>Sporta</strong> {params.frenoyClubIdSporta}
          <br />
          <br />
          <strong>{t('clubs.generalInfo.balls')}</strong>
          <br />
          {params.compBalls}
          <br />
          <h2>{t('clubs.generalInfo.moneyMoney')}</h2>
          {params.adultMembership}
          <br />
          {params.youthMembership}
          <br />
          {params.recreationalMembers}
          <div style={{ marginTop: 16, fontSize: 12 }}>{params.additionalMembership}</div>
          <br />
          <strong>{t('clubs.generalInfo.bankNr')}</strong> {params.clubBankNr}
          <br />
        </div>
        <div className="col-md-6">
          <h2 className="d-block d-md-none">{t('clubs.generalInfo.googleMap')}</h2>
          <GoogleMap />
        </div>
      </div>
    </div>
  );
};
