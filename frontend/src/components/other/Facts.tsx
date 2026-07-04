import Accordion from 'react-bootstrap/Accordion';
import { t } from '../../locales';
import './Facts.css';

const Facts = () => (
  <Accordion className="facts-accordion" style={{ marginTop: 10 }} id="navigation">
    <Accordion.Item eventKey="1">
      <Accordion.Header>
        <b>{t('facts.service')}</b>
      </Accordion.Header>
      <Accordion.Body>
        <h1>{t('facts.serviceHeaderOne')}</h1>
        <p>{t('facts.serviceSectionOneComponentOne')}</p>
        <br />
        <h1>{t('facts.serviceSectionOneComponentTwo')}</h1>
        <p>{t('facts.serviceSectionOneComponentThree')}</p>
        <ul>
          <li>
            <strong>{t('facts.serviceSectionOneComponentFour')}</strong>
            {t('facts.serviceSectionOneComponentFive')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionOneComponentSix')}</strong>
            {t('facts.serviceSectionOneComponentSeven')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionOneComponentEight')}</strong>
            {t('facts.serviceSectionOneComponentNine')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionOneComponentTen')}</strong>
            {t('facts.serviceSectionOneComponentEleven')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionOneComponentTwelve')}</strong>
            {t('facts.serviceSectionOneComponentThirteen')}
          </li>
        </ul>
        <br />
        <h1>{t('facts.serviceSectionOneComponentFourteen')}</h1>
        <p>{t('facts.serviceSectionOneComponentFifteen')}</p>
        <br />
        <h1>{t('facts.serviceSectionOneComponentSixteen')}</h1>
        <p>{t('facts.serviceSectionOneComponentSeventeen')}</p>
        <figure style={{ textAlign: 'center' }}>
          <img src="/img/facts/service1.gif" alt="serviceFigureOne" />
          <figcaption>{t('facts.serviceFigureCaptionOne')}</figcaption>
        </figure>
        <br />
        <h4>{t('facts.serviceSectionOneComponentEightteen')}</h4>
        <p>{t('facts.serviceSectionOneComponentNineteen')}</p>
        <br />
        <figure style={{ textAlign: 'center' }}>
          <img src="/img/facts/service2.gif" alt="serviceFigureTwo" />
          <figcaption>{t('facts.serviceFigureCaptionTwo')}</figcaption>
        </figure>
        <p>
          <br />
          <br />
          {t('facts.serviceSectionOneComponentTwenty')}
          <br />
          <br />
          {t('facts.serviceSectionOneComponentTwentyOne')}
          <br />
          <br />
          {t('facts.serviceSectionOneComponentTwentyTwo')}
        </p>
        <br />
        <h4></h4>
        <p>{t('facts.serviceSectionOneComponentTwentyFour')}</p>
        <br />
        <h4>{t('facts.serviceSectionOneComponentTwentyFive')}</h4>
        <p>
          {t('facts.serviceSectionOneComponentTwentySix')}
          <br />
          <br />
          {t('facts.serviceSectionOneComponentTwentySeven')}
          <br />
          <br />
          {t('facts.serviceSectionOneComponentTwentyEight')}
          <br />
          {t('facts.serviceSectionOneComponentTwentyNine')}
        </p>
      </Accordion.Body>
    </Accordion.Item>

    <Accordion.Item eventKey="2">
      <Accordion.Header>
        <b>{t('facts.longpimples')}</b>
      </Accordion.Header>
      <Accordion.Body>
        <p>
          {t('facts.serviceSectionTwoComponentOne')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentTwo')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentThree')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentFour')}
        </p>
        <figure>
          <img src="/img/facts/longpimples.jpg" className="img-responsive center-block" alt="longPimples" />
        </figure>
        <br />
        <p>
          {t('facts.serviceSectionTwoComponentFive')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentSix')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentSeven')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentEight')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentNine')}
          <br />
          <br />
          {t('facts.serviceSectionTwoComponentTen')}
        </p>
      </Accordion.Body>
    </Accordion.Item>

    <Accordion.Item eventKey="3">
      <Accordion.Header>
        <b>{t('facts.speed')}</b>
      </Accordion.Header>
      <Accordion.Body>
        <p>{t('facts.serviceSectionThreeComponentOne')}</p>
        <ol>
          <li>{t('facts.serviceSectionThreeComponentTwo')}</li>
          <li>{t('facts.serviceSectionThreeComponentThree')}</li>
          <li>{t('facts.serviceSectionThreeComponentFour')}</li>
          <li>{t('facts.serviceSectionThreeComponentFive')}</li>
        </ol>
        <p>{t('facts.serviceSectionThreeComponentSix')}</p>
        <strong>{t('facts.serviceSectionThreeComponentSeven')}</strong>
        <br />
        <br />
        <p>{t('facts.serviceSectionThreeComponentEight')}</p>
        <ol>
          <li>{t('facts.serviceSectionThreeComponentNine')}</li>
          <li>{t('facts.serviceSectionThreeComponentTen')}</li>
          <li>{t('facts.serviceSectionThreeComponentEleven')}</li>
          <li>{t('facts.serviceSectionThreeComponentTwelve')}</li>
          <li>{t('facts.serviceSectionThreeComponentThirteen')}</li>
          <li>{t('facts.serviceSectionThreeComponentFourteen')}</li>
          <li>{t('facts.serviceSectionThreeComponentFifteen')}</li>
          <li>{t('facts.serviceSectionThreeComponentSixteen')}</li>
          <li>{t('facts.serviceSectionThreeComponentSeventeen')}</li>
        </ol>
        <p>{t('facts.serviceSectionThreeComponentEightteen')}</p>
      </Accordion.Body>
    </Accordion.Item>

    <Accordion.Item eventKey="4">
      <Accordion.Header>
        <b>{t('facts.astrology')}</b>
      </Accordion.Header>
      <Accordion.Body>
        <h1>{t('facts.serviceSectionFourComponentOne')}</h1>
        <p>{t('facts.serviceSectionFourComponentTwo')}</p>
        <p>{t('facts.serviceSectionFourComponentThree')}</p>
        <ul>
          <li>
            <strong>{t('facts.serviceSectionFourComponentFour')}</strong> {t('facts.serviceSectionFourComponentFive')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentSix')}</strong> {t('facts.serviceSectionFourComponentSeven')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentEight')}</strong> {t('facts.serviceSectionFourComponentNine')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentTen')}</strong> {t('facts.serviceSectionFourComponentEleven')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentTwelve')}</strong> {t('facts.serviceSectionFourComponentThirteen')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentFourteen')}</strong> {t('facts.serviceSectionFourComponentFifteen')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentSixteen')}</strong> {t('facts.serviceSectionFourComponentSeventeen')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentEightteen')}</strong> {t('facts.serviceSectionFourComponentNineteen')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentTwenty')}</strong> {t('facts.serviceSectionFourComponentTwentyOne')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentTwentyTwo')}</strong> {t('facts.serviceSectionFourComponentTwentyThree')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentTwentyFour')}</strong> {t('facts.serviceSectionFourComponentTwentyFive')}
          </li>
          <li>
            <strong>{t('facts.serviceSectionFourComponentTwentySix')}</strong> {t('facts.serviceSectionFourComponentTwentySeven')}
          </li>
        </ul>
      </Accordion.Body>
    </Accordion.Item>

    <Accordion.Item eventKey="5">
      <Accordion.Header>
        <b>{t('facts.history')}</b>
      </Accordion.Header>
      <Accordion.Body>
        <h1>{t('facts.serviceSectionFiveComponentOne')}</h1>
        <p>{t('facts.serviceSectionFiveComponentTwo')}</p>
        <h1>{t('facts.serviceSectionFiveComponentThree')}</h1>
        <p>{t('facts.serviceSectionFiveComponentFour')}</p>
        <h1>{t('facts.serviceSectionFiveComponentFive')}</h1>
        <p>{t('facts.serviceSectionFiveComponentSix')}</p>
      </Accordion.Body>
    </Accordion.Item>
  </Accordion>
);

export default Facts;
