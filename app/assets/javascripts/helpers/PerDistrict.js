import * as Filters from './Filters';
import _ from 'lodash';


export const SOMERVILLE = 'somerville';
export const NEW_BEDFORD = 'new_bedford';
export const BEDFORD = 'bedford';
export const DEMO = 'demo';

export function hasStudentPhotos(districtKey) {
  if (districtKey === SOMERVILLE) return true;
  if (districtKey === NEW_BEDFORD) return false;
  return false;
}


// See also specialEducation.js
const ORDERED_DISABILITY_VALUES_MAP = {
  [NEW_BEDFORD]: [
    "Does Not Apply",
    "Low-Less Than 2hrs/week",
    "Low-2+ hrs/week",
    "Moderate",
    "High"
  ],
  [SOMERVILLE]: [
    // also include null
    'Low < 2',
    'Low >= 2',
    'Moderate',
    'High'
  ],
  [BEDFORD]: [    
    'Does Not Apply',
    'Low (2 hours or less)',
    'Low (2 or more hours)',
    'Moderate',
    'High'
  ]
};

export function orderedDisabilityValues(districtKey) {
  return ORDERED_DISABILITY_VALUES_MAP[districtKey] || [];
}

// Includes if they "exited" the 504
export function hasInfoAbout504Plan(maybeStudent504Field) {
  if (maybeStudent504Field === undefined) return false;
  if (maybeStudent504Field === null) return false;
  if (maybeStudent504Field === '') return false;
  if (maybeStudent504Field === '504') return true; // Somerville
  if (maybeStudent504Field === 'Not 504') return false; // Somerville
  if (maybeStudent504Field === 'NotIn504') return false; // Somerville & New Bedford
  if (maybeStudent504Field === 'Exited') return true; // New Bedford
  if (maybeStudent504Field === 'Active') return true; // New Bedford

  return true;
}



// Renders a table for `SlicePanels` that works differently for different
// districts.
export function renderSlicePanelsDisabilityTable(districtKey, options = {}) {
  const {createItemFn, renderTableFn} = options;

  const key = 'sped_level_of_need';
  const itemsFromValues = orderedDisabilityValues(districtKey).map(value => {
    return createItemFn(value, Filters.Equal(key, value));
  });

  // Somerville uses a null value for no disability instead of an explicit value.
  const items = (districtKey === SOMERVILLE)
    ? [createItemFn('None', Filters.Null(key))].concat(itemsFromValues)
    : itemsFromValues;
  return renderTableFn({items, title: 'Disability'});
}

// Check educator labels to see if the educator should be shown 
// info about students in their courses with low grades.
export function shouldShowLowGradesBox(educatorLabels) {
  return (educatorLabels.indexOf('should_show_low_grades_box') !== -1);
}


const ORDERED_SOMERVILLE_SCHOOL_SLUGS_BY_GRADE = {
  'pic': 10,
  'cap': 100,
  'brn': 200,
  'hea': 300,
  'kdy': 300,
  'afas': 300,
  'escs': 300,
  'wsns': 300,
  'whcs': 300,
  'nw': 400,
  'shs': 500,
  'fc': 500,
  'sped': 600
};

export function sortSchoolSlugsByGrade(districtKey, slugA, slugB) {
  if (districtKey === SOMERVILLE) {
    return ORDERED_SOMERVILLE_SCHOOL_SLUGS_BY_GRADE[slugA] - ORDERED_SOMERVILLE_SCHOOL_SLUGS_BY_GRADE[slugB];
  }

  return slugA.localeCompare(slugB);
}

export function supportsHouse(districtKey) {
  if (districtKey === SOMERVILLE) return true;
  if (districtKey === BEDFORD) return true;
  if (districtKey === DEMO) return true;
  return false;
}

// This only applies to Somerville HS.
export function shouldDisplayHouse(school) {
  return (school && school.local_id === 'SHS');
}

export function somervilleHouses() {
  return [
    'Beacon',
    'Broadway',
    'Elm',
    'Highland'
  ];
}

export function supportsCounselor(districtKey) {
  if (districtKey === SOMERVILLE) return true;
  if (districtKey === DEMO) return true;
  return false;
}

// This only applies to high schools.
export function shouldDisplayCounselor(school) {
  return (school && school.school_type === 'HS');
}

export function supportsSpedLiaison(districtKey) {
  if (districtKey === SOMERVILLE) return true;
  if (districtKey === DEMO) return true;
  return false;
}

export function supportsExcusedAbsences(districtKey) {
  if (districtKey === NEW_BEDFORD) return false;
  
  if (districtKey === BEDFORD) return true;
  if (districtKey === SOMERVILLE) return true;
  if (districtKey === DEMO) return true;
  
  return false;
}

// In high school, homeroom is a logical administrative assignment,
// but isn't meaningful to teachers or educators.  If there is
// a homeroom, it might not necessarily be worth showing.
export function isHomeroomMeaningful(schoolType) {
  return (schoolType !== 'HS');
}

// What is the eventNoteTypeId to use in user-facing text about how to support
// students with high absences?
export function eventNoteTypeIdForAbsenceSupportMeeting(districtKey) {
  if (districtKey === BEDFORD) return 500; // stat
  if (districtKey === NEW_BEDFORD) return 400; // bbst
  if (districtKey === SOMERVILLE) return 300; // sst

  return 300;
}

// For searching notes, derived from choices for taking notes
export function eventNoteTypeIdsForSearch(districtKey) {
  const {leftEventNoteTypeIds, rightEventNoteTypeIds} = takeNotesChoices(districtKey);
  return _.uniq(leftEventNoteTypeIds.concat(rightEventNoteTypeIds));
}


// What choices do educators have for taking notes in the product?
export function takeNotesChoices(districtKey) {
  if (districtKey === SOMERVILLE || districtKey === DEMO) {
    return {
      leftEventNoteTypeIds: [300, 301, 302, 304],
      rightEventNoteTypeIds: [305, 306, 307, 308]
    };
  }

  if (districtKey === BEDFORD) {
    return {
      leftEventNoteTypeIds: [500, 302, 304],
      rightEventNoteTypeIds: [501, 502, 503]
    };
  }

  if (districtKey === NEW_BEDFORD) {
    return {
      leftEventNoteTypeIds: [400, 302, 304],
      rightEventNoteTypeIds: []
    };
  }

  throw new Error(`unsupported districtKey: ${districtKey}`);
}

// In tables of students, what eventNoteTypeIds should be shown as columns with notes
// about those students?
export function studentTableEventNoteTypeIds(districtKey, schoolType) {
  if (districtKey === BEDFORD) return [500, 501, 502, 503];
  if (districtKey === NEW_BEDFORD) return [400];
  
  const isSomervilleOrDemo = (districtKey === SOMERVILLE || districtKey === DEMO);
  if (isSomervilleOrDemo && schoolType === 'HS') return [300, 305, 306, 307, 308];
  // Includes elementary/middle, Capuano early childhood, and SPED.
  if (isSomervilleOrDemo) return [300, 301];

  throw new Error(`unsupported districtKey: ${districtKey}`);
}


// See PerDistrict.rb#does_students_export_include_rows_for_inactive_students?
export function isStudentActive(districtKey, student) {
  if (districtKey === BEDFORD) return !student.missing_from_last_export;
  if (districtKey === NEW_BEDFORD) return !student.missing_from_last_export;
  if (districtKey === SOMERVILLE) return student.enrollment_status === 'Active';

  // Check both as fallback
  return student.enrollment_status === 'Active' && !student.missing_from_last_export;
}


// Should STAR be used instead of MCAS in K8 student profiles?
export function useStarForProfileColumns(districtKey) {
  if (districtKey === SOMERVILLE) return true;
  if (districtKey === DEMO) return true;
  if (districtKey === NEW_BEDFORD) return true;
  if (districtKey === BEDFORD) return false; // no STAR data

  return false;
}