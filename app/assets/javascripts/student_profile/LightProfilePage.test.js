import React from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';
import {toMomentFromTimestamp} from '../helpers/toMoment';
import {withDefaultNowContext} from '../testing/NowContainer';
import LightProfilePage, {latestStar} from './LightProfilePage';
import {
  testPropsForPlutoPoppins,
  testPropsForOlafWhite,
  testPropsForAladdinMouse
} from './StudentProfilePage.test';


function testingTabTextLines(el) {
  const leafEls = $(el).find('.LightProfileTab:eq(2) *:not(:has(*))').toArray(); // magic selector from https://stackoverflow.com/questions/4602431/what-is-the-most-efficient-way-to-get-leaf-nodes-with-jquery#4602476
  return leafEls.map(el => $(el).text());
}

function testRender(props) {
  const el = document.createElement('div');
  ReactDOM.render(<LightProfilePage {...props} />, el);
  return el;
}

it('renders without crashing', () => {
  testRender(testPropsForPlutoPoppins());
});

describe('snapshots', () => {
  function expectSnapshot(props) {
    const tree = renderer
      .create(withDefaultNowContext(<LightProfilePage {...props} />))
      .toJSON();
    expect(tree).toMatchSnapshot();
  }

  it('works for olaf notes', () => expectSnapshot(testPropsForOlafWhite({selectedColumnKey: 'notes'})));
  it('works for olaf reading', () => expectSnapshot(testPropsForOlafWhite({selectedColumnKey: 'reading'})));
  it('works for olaf math', () => expectSnapshot(testPropsForOlafWhite({selectedColumnKey: 'math'})));

  it('works for pluto notes', () => expectSnapshot(testPropsForPlutoPoppins({selectedColumnKey: 'notes'})));
  it('works for pluto attendance', () => expectSnapshot(testPropsForPlutoPoppins({selectedColumnKey: 'attendance'})));
  it('works for pluto behavior', () => expectSnapshot(testPropsForPlutoPoppins({selectedColumnKey: 'behavior'})));

  it('works for aladdin notes', () => expectSnapshot(testPropsForAladdinMouse({selectedColumnKey: 'notes'})));
  it('works for aladdin grades', () => expectSnapshot(testPropsForAladdinMouse({selectedColumnKey: 'grades'})));
  it('works for aladdin testing', () => expectSnapshot(testPropsForAladdinMouse({selectedColumnKey: 'testing'})));
});


it('#latestStar works regardless of initial sort order', () => {
  const nowMoment = toMomentFromTimestamp('2018-08-13T11:03:06.123Z');
  const starSeriesReadingPercentile = [
    {"percentile_rank":98,"total_time":1134,"grade_equivalent":"6.90","date_taken":"2017-04-23T06:00:00.000Z"},
    {"percentile_rank":94,"total_time":1022,"grade_equivalent":"4.80","date_taken":"2017-01-07T02:00:00.000Z"}
  ];
  expect(latestStar(starSeriesReadingPercentile, nowMoment)).toEqual({
    nDaysText: 'a year ago',
    percentileText: '98th'
  });
  expect(latestStar(starSeriesReadingPercentile.reverse(), nowMoment)).toEqual({
    nDaysText: 'a year ago',
    percentileText: '98th'
  });
});

describe('HS testing tab', () => {
  it('works when missing', () => {
    const props = testPropsForAladdinMouse();
    const el = testRender(props);
    expect(testingTabTextLines(el)).toEqual([
      'Testing',
      '-',
      'ELA and Math MCAS',
      'not yet taken'
    ]);
  });

  it('takes next gen when there are both', () => {
    const aladdinProps = testPropsForAladdinMouse();
    const props = {
      ...aladdinProps,
      chartData: {
        ...aladdinProps.chartData,
        "next_gen_mcas_mathematics_scaled": [[2014,5,15,537]],
        "next_gen_mcas_ela_scaled": [[2015,5,15,536]],
        "mcas_series_math_scaled": [[2015,5,15,225]],
        "mcas_series_ela_scaled": [[2015,5,15,225]]
      }
    };
    const el = testRender(props);
    expect(testingTabTextLines(el)).toEqual([
      'Testing',
      'M',
      'ELA and Math MCAS',
      '9 months ago / 2 years ago'
    ]);
  });

  it('falls back to old MCAS when no next gen', () => {
    const aladdinProps = testPropsForAladdinMouse();
    const props = {
      ...aladdinProps,
      chartData: {
        ...aladdinProps.chartData,
        "next_gen_mcas_mathematics_scaled": [],
        "next_gen_mcas_ela_scaled": [],
        
        "mcas_series_math_scaled": [[2015,5,15,225]],
        "mcas_series_ela_scaled": [[2015,5,15,225]]
      }
    };
    const el = testRender(props);
    expect(testingTabTextLines(el)).toEqual([
      'Testing',
      'NI',
      'ELA and Math MCAS',
      '9 months ago'
    ]);
  });
});