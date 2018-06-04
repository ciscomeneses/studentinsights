import ReactTestUtils from 'react-addons-test-utils';


// Update the text value of an input or textarea, and simulate the React
// change event.
export default function changeTextValue(el, value) {
  console.log('changeTextValue', $(el).html(), value);
  ReactTestUtils.Simulate.change(el, {target: {value}});
}