// VJR Estate — employee hierarchy.
// Departments hold their own designations (sub-categories), e.g. Sales →
// Telecaller Agent, Field Sales Executive… Each role maps to an ID prefix so
// employee IDs are generated from the role (VJR-<DEPT>-<ROLE>-<NNN>).

export const DEPARTMENTS = [
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'HR',
  'IT',
  'Legal',
];

export const DESIGNATIONS_BY_DEPARTMENT: Record<string, string[]> = {
  Sales: [
    'Telecaller Agent',
    'Field Sales Executive',
    'Sales Executive',
    'Senior Sales Executive',
    'Sales Manager',
    'Senior Sales Manager',
    'Area Sales Manager',
    'Regional Manager',
    'Team Lead',
    'Channel Partner',
  ],
  Marketing: [
    'Marketing Executive',
    'Digital Marketing Executive',
    'Social Media Executive',
    'Content Writer',
    'Graphic Designer',
    'Marketing Manager',
  ],
  Operations: [
    'Operations Executive',
    'Back Office Executive',
    'Documentation Executive',
    'Site Visit Coordinator',
    'Operations Manager',
  ],
  Finance: [
    'Accountant',
    'Finance Executive',
    'Finance Manager',
  ],
  HR: [
    'HR Executive',
    'Recruiter',
    'HR Manager',
  ],
  IT: [
    'IT Support',
    'Web Developer',
    'Software Engineer',
    'IT Manager',
  ],
  Legal: [
    'Legal Executive',
    'Legal Manager',
  ],
};

export const DEPARTMENT_PREFIX: Record<string, string> = {
  Sales: 'SL',
  Marketing: 'MK',
  Operations: 'OP',
  Finance: 'FN',
  HR: 'HR',
  IT: 'IT',
  Legal: 'LG',
};

const DESIGNATION_PREFIX: Record<string, string> = {
  'Telecaller Agent': 'TC',
  'Field Sales Executive': 'FS',
  'Sales Executive': 'SE',
  'Senior Sales Executive': 'SSE',
  'Sales Manager': 'SM',
  'Senior Sales Manager': 'SSM',
  'Area Sales Manager': 'ASM',
  'Regional Manager': 'RM',
  'Team Lead': 'TL',
  'Channel Partner': 'CP',
  'Marketing Executive': 'ME',
  'Digital Marketing Executive': 'DME',
  'Social Media Executive': 'SME',
  'Content Writer': 'CW',
  'Graphic Designer': 'GD',
  'Marketing Manager': 'MM',
  'Operations Executive': 'OE',
  'Back Office Executive': 'BO',
  'Documentation Executive': 'DOC',
  'Site Visit Coordinator': 'SVC',
  'Operations Manager': 'OM',
  Accountant: 'ACC',
  'Finance Executive': 'FE',
  'Finance Manager': 'FM',
  'HR Executive': 'HRE',
  Recruiter: 'REC',
  'HR Manager': 'HRM',
  'IT Support': 'ITS',
  'Web Developer': 'WD',
  'Software Engineer': 'SWE',
  'IT Manager': 'ITM',
  'Legal Executive': 'LE',
  'Legal Manager': 'LM',
};

/** Deterministic ID prefix from role, e.g. Sales + Telecaller Agent → SL-TC. */
export function idPrefixFor(department: string, designation: string): string {
  const dept = DEPARTMENT_PREFIX[department] ?? (department.replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase() || 'EM');
  const role = DESIGNATION_PREFIX[designation] ?? (designation.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'XX');
  return `${dept}-${role}`;
}

/** Designations available for a department (sub-categories). */
export function designationsFor(department: string): string[] {
  return DESIGNATIONS_BY_DEPARTMENT[department] ?? [];
}
