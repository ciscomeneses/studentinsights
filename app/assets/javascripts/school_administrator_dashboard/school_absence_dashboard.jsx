import React from 'react';
import _ from 'lodash';

import DashboardHelpers from './dashboard_helpers.jsx';
import StudentsTable from './students_table.jsx';
import DashboardBarChart from './dashboard_bar_chart.jsx';
import DateSlider from './date_slider.jsx';


export default React.createClass({
  displayName: 'SchoolAbsenceDashboard',

  propTypes: {
    schoolAverageDailyAttendance: React.PropTypes.object.isRequired,
    homeroomAverageDailyAttendance: React.PropTypes.object.isRequired,
    dashboardStudents: React.PropTypes.array.isRequired,
    dateRange: React.PropTypes.array.isRequired
  },

  getInitialState: function() {
    return {
      displayDates: this.props.dateRange,
      selectedHomeroom: null
    };
  },

  //Monthly attendance for the school must be calculated after the range filter is applied
  monthlySchoolAttendance: function(schoolAverageDailyAttendance) {
    let monthlySchoolAttendance = {};
    //Use the filtered daterange to find the days to include
    this.state.displayDates.forEach((day) => {
      let date = moment(day).date(1).format("YYYY-MM-DD"); //first day of the month in which 'day' occurs
      (monthlySchoolAttendance[date] === undefined) ? //if there's nothing for this month yet
      monthlySchoolAttendance[date] = [schoolAverageDailyAttendance[day]] :
      monthlySchoolAttendance[date] = monthlySchoolAttendance[date].concat(schoolAverageDailyAttendance[day]);
    });
    return monthlySchoolAttendance;
  },

  filteredHomeRoomAttendance: function(dailyHomeroomAttendance) {
    return _.map(dailyHomeroomAttendance, (homeroom) => {
      return this.state.displayDates.map((date) => {
        return homeroom[date];
      });
    });
  },

  studentAbsenceCount: function(absences) {
    return absences.filter((event) => {
      const start_date = this.state.displayDates[0];
      const end_date = this.state.displayDates[this.state.displayDates.length-1];
      return moment.utc(event.occurred_at).isBetween(start_date, end_date, null, '[]');
    }).length;
  },

  setDate: function(range) {
    this.setState({
      displayDates: DashboardHelpers.filterDates(this.props.dateRange,
                                                  moment.unix(range[0]).format("YYYY-MM-DD"),
                                                  moment.unix(range[1]).format("YYYY-MM-DD"))
    });
  },

  setStudentList: function(highchartsEvent) {
    this.setState({selectedHomeroom: highchartsEvent.point.category});
  },

  resetStudentList: function() {
    this.setState({selectedHomeroom: null});
  },

  render: function() {
    return (
        <div>
          <div className="DashboardChartsColumn">
            {this.renderMonthlyAbsenceChart()}
            {this.renderHomeroomAbsenceChart()}
          </div>
          <div className="DashboardRosterColumn">
            {this.renderDateRangeSlider()}
            {this.renderStudentAbsenceTable()}
          </div>
        </div>
    );
  },

  renderMonthlyAbsenceChart: function() {
    const monthlyAttendance = this.monthlySchoolAttendance(this.props.schoolAverageDailyAttendance);
    const filteredAttendanceSeries = Object.keys(monthlyAttendance).map( (month) => {
      const rawAvg = _.sum(monthlyAttendance[month])/monthlyAttendance[month].length;
      return Math.round(rawAvg*10)/10;
    });
    const categories = Object.keys(monthlyAttendance);

    return (
        <DashboardBarChart
          id = {'string'}
          categories = {categories}
          seriesData = {filteredAttendanceSeries}
          monthsBack = {categories.length}
          titleText = {'Average Attendance By Month'}
          measureText = {'Attendance (Percent)'}
          onColumnClick = {this.resetStudentList}
          onBackgroundClick = {this.resetStudentList}/>
    );
  },

  renderHomeroomAbsenceChart: function() {
    const homeroomAverageDailyAttendance = this.props.homeroomAverageDailyAttendance;
    const filteredHomeRoomAttendance = this.filteredHomeRoomAttendance(homeroomAverageDailyAttendance);
    const homeroomSeries = filteredHomeRoomAttendance.map((homeroom) => {
      const rawAvg = _.sum(homeroom)/homeroom.length;
      return Math.round(rawAvg*10)/10;
    });
    return (
        <DashboardBarChart
          id = {'string'}
          categories = {Object.keys(homeroomAverageDailyAttendance)}
          seriesData = {homeroomSeries}
          monthsBack = {12}
          titleText = {'Average Attendance By Homeroom'}
          measureText = {'Attendance (Percent)'}
          onColumnClick = {this.setStudentList}
          onBackgroundClick = {this.resetStudentList}/>
    );
  },

  renderStudentAbsenceTable: function () {
    let rows =[];
    const studentsByHomeroom = DashboardHelpers.groupByHomeroom(this.props.dashboardStudents);
    const students = studentsByHomeroom[this.state.selectedHomeroom] || this.props.dashboardStudents;
    students.forEach((student) => {
      rows.push({
        first_name: student.first_name,
        last_name: student.last_name,
        absences: this.studentAbsenceCount(student.absences)
      });
    });

    return (
      <StudentsTable
        rows = {rows}
        selectedHomeroom = {this.state.selectedHomeroom}/>
    );
  },

  renderDateRangeSlider: function() {
    const firstDate = this.props.dateRange[0];
    const lastDate = this.props.dateRange[this.props.dateRange.length - 1];
    return (
      <DateSlider
        rangeStart = {parseInt(moment(firstDate).format("X"))}
        rangeEnd = {parseInt(moment(lastDate).format("X"))}
        setDate={this.setDate}/>
    );
  }
});
