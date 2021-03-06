import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import SimpleFilterSelect, {ALL} from './SimpleFilterSelect';
import {maybeCapitalize} from '../helpers/pretty';
import {somervilleHouses} from '../helpers/PerDistrict';


// For selecting a House (Somerville HS)
export default function SelectHouse({house, onChange, houses, style = undefined}) {
  const sortedHouses = _.sortBy(houses || somervilleHouses());
  const houseOptions = [{value: ALL, label: 'All'}].concat(sortedHouses.map(house => {
    return { value: house, label: maybeCapitalize(house) };
  }));
  return (
    <SimpleFilterSelect
      style={style}
      placeholder="House..."
      value={house}
      onChange={onChange}
      options={houseOptions} />
  );
}
SelectHouse.propTypes = {
  house: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  houses: PropTypes.arrayOf(PropTypes.string),
  style: PropTypes.object
};