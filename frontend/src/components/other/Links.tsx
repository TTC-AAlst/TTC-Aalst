import { t } from '../../locales';

const Links = () => (
  <div style={{ marginTop: 10 }}>
    <table className="table table-striped table-bordered table-hover">
      <tbody>
        <tr className="info">
          <td className="tableHeader">{t('links.federations')}</td>
        </tr>
        <tr>
          <td>
            <a href="https://www.vttl.be" target="_blank" rel="noopener noreferrer">
              {t('links.vttl')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://www.ovl.vttl.be/" target="_blank" rel="noopener noreferrer">
              {t('links.vttlovl')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://sportateam.be/public/tafeltennis" target="_blank" rel="noopener noreferrer">
              {t('links.sporta')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://www.ittf.com/" target="_blank" rel="noopener noreferrer">
              {t('links.ittf')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://www.ettu.org/" target="_blank" rel="noopener noreferrer">
              {t('links.ettu')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://competitie.vttl.be/?menu=0" target="_blank" rel="noopener noreferrer">
              {t('links.vttlResults')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://ttonline.sporta.be/" target="_blank" rel="noopener noreferrer">
              {t('links.sportaResults')}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
    <br />
    <table className="table table-striped table-bordered table-hover">
      <tbody>
        <tr className="info">
          <td className="tableHeader">{t('links.varia')}</td>
        </tr>
        <tr>
          <td>
            <a href="https://tournooike.ttc-aalst.be" target="_blank" rel="noopener noreferrer">
              {t('links.tournooike')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://ttc-aalst.be/tabt-api.html" target="_blank" rel="noopener noreferrer">
              TabT API Test Form
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://github.com/TTC-AAlst/TTC-Aalst" target="_blank" rel="noopener noreferrer">
              Github Source Code
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://ttcsintpauwels.be/competitie/vttl/bereken-je-klassement/" target="_blank" rel="noopener noreferrer">
              {t('links.vttlCalculationOne')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://ttcsintpauwels.be/competitie/sporta/bereken-je-klassement/" target="_blank" rel="noopener noreferrer">
              {t('links.sportaCalculation')}
            </a>
          </td>
        </tr>
        {/* <tr>
          <td><a href="https://www.ttcdepinte.be/classify" target="_blank" rel="noopener noreferrer">{t('links.vttlCalculationTwo')}</a></td>
        </tr> */}
        <tr>
          <td>
            <a href="https://www.tafeltennis.be/" target="_blank" rel="noopener noreferrer">
              {t('links.killypong')}
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="https://nl.dandoy-sports.eu/" target="_blank" rel="noopener noreferrer">
              {t('links.dandoy')}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

export default Links;
