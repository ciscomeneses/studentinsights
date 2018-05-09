import React from 'react';
import BreakdownBar from '../components/BreakdownBar';


// Visual component showing a horizontal bar broken down into three colors
// showing percent of students at different DIBELS levels.
export default class DibelsBreakdownBar extends React.Component {
  render() {
    const {coreCount, strategicCount, intensiveCount} = this.props;
    const items = [
      { left: 0, width: coreCount, color: 'green', key: 'core' },
      { left: coreCount, width: intensiveCount, color: 'orange', key: 'strategic' },
      { left: coreCount + intensiveCount, width: strategicCount, color: 'red', key: 'intensive' }
    ];

    return <BreakdownBar items={items} {...this.props} />;
  }
}

DibelsBreakdownBar.propTypes = {
  coreCount: React.PropTypes.number.isRequired,
  strategicCount: React.PropTypes.number.isRequired,
  intensiveCount: React.PropTypes.number.isRequired,
  height: React.PropTypes.number.isRequired,
  labelTop: React.PropTypes.number.isRequired,
  style: React.PropTypes.object,
  innerStyle: React.PropTypes.object
};
