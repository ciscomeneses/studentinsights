import React from 'react';
import GenericLoader from '../components/GenericLoader';
import {apiFetchJson} from '../helpers/apiFetchJson';
import moment from 'moment';
import _ from 'lodash';
import {toMomentFromTime} from '../helpers/toMoment';

export default class LoginActivityPage extends React.Component {

  fetchLoginActivities() {
    const nowTimestamp = moment().unix();
    const thirtyDaysAgoTimestamp = moment().subtract(30, 'days').unix();

    const endpoint = '/api/login_activity';
    const params = `?created_at_or_before=${nowTimestamp}&created_after=${thirtyDaysAgoTimestamp}`;
    const url = endpoint + params;

    return apiFetchJson(url);
  }

  render() {
    return (
      <GenericLoader
        promiseFn={this.fetchLoginActivities}
        render={this.renderPage} />
    );
  }

  renderPage(loginActivityJson) {
    const toMoment = loginActivityJson.map((activity) => {
      return {...activity, ...{created_at: toMomentFromTime(activity.created_at)}};
    });

    // Group activities by email identity
    const byEmail = _.groupBy(toMoment, 'identity');

    // Iterate through each identity and group login activity by day
    _.forOwn(byEmail, (value, key, collection) => {
      collection[key] = _.groupBy(value, (activity) => {
        return activity.created_at.startOf('day');
      });
    });

    // Iterate through each day and group by success/fail
    _.forOwn(byEmail, (identityLoginsByDay, identity, collection) => {
      _.forOwn(identityLoginsByDay, (activities, day, collection) => {
        identityLoginsByDay[day] = _.countBy(activities, (activity) => {
          return activity.success ? 'success' : 'fail';
        });
      });
    });

    console.log('byEmail', byEmail);
    return null;
  }

}
