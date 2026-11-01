import type { SubjectInput } from './api';

/** Suggested categories; a school can type its own. */
export const SUBJECT_CATEGORIES = [
  'Languages',
  'Mathematics',
  'Science',
  'Social studies',
  'Creative arts',
  'Religious and moral',
  'Physical education',
  'Technical',
  'Montessori area',
];

/** Starter lists a school can add in one go, then rename or extend. */
export const COMMON_SUBJECTS: {
  group: string;
  subjects: Required<Omit<SubjectInput, 'isActive'>>[];
}[] = [
  {
    group: 'Primary and JHS (GES curriculum)',
    subjects: [
      {
        subjectCode: 'ENG',
        subjectName: 'English Language',
        shortName: 'English',
        category: 'Languages',
      },
      {
        subjectCode: 'MATH',
        subjectName: 'Mathematics',
        shortName: 'Maths',
        category: 'Mathematics',
      },
      { subjectCode: 'SCI', subjectName: 'Science', shortName: 'Science', category: 'Science' },
      {
        subjectCode: 'OWOP',
        subjectName: 'Our World Our People',
        shortName: 'OWOP',
        category: 'Social studies',
      },
      {
        subjectCode: 'SOC',
        subjectName: 'Social Studies',
        shortName: 'Social',
        category: 'Social studies',
      },
      {
        subjectCode: 'HIST',
        subjectName: 'History',
        shortName: 'History',
        category: 'Social studies',
      },
      {
        subjectCode: 'RME',
        subjectName: 'Religious and Moral Education',
        shortName: 'RME',
        category: 'Religious and moral',
      },
      {
        subjectCode: 'GHL',
        subjectName: 'Ghanaian Language',
        shortName: 'Gh. Lang',
        category: 'Languages',
      },
      { subjectCode: 'FRE', subjectName: 'French', shortName: 'French', category: 'Languages' },
      {
        subjectCode: 'CA',
        subjectName: 'Creative Arts',
        shortName: 'Creative Arts',
        category: 'Creative arts',
      },
      {
        subjectCode: 'CAD',
        subjectName: 'Creative Arts and Design',
        shortName: 'CAD',
        category: 'Creative arts',
      },
      {
        subjectCode: 'COMP',
        subjectName: 'Computing',
        shortName: 'Computing',
        category: 'Technical',
      },
      {
        subjectCode: 'CT',
        subjectName: 'Career Technology',
        shortName: 'Career Tech',
        category: 'Technical',
      },
      {
        subjectCode: 'PHE',
        subjectName: 'Physical and Health Education',
        shortName: 'PHE',
        category: 'Physical education',
      },
    ],
  },
  {
    group: 'Montessori and early years',
    subjects: [
      {
        subjectCode: 'PL',
        subjectName: 'Practical Life',
        shortName: 'Practical Life',
        category: 'Montessori area',
      },
      {
        subjectCode: 'SEN',
        subjectName: 'Sensorial',
        shortName: 'Sensorial',
        category: 'Montessori area',
      },
      {
        subjectCode: 'LANG',
        subjectName: 'Language',
        shortName: 'Language',
        category: 'Montessori area',
      },
      {
        subjectCode: 'NUM',
        subjectName: 'Numeracy',
        shortName: 'Numeracy',
        category: 'Montessori area',
      },
      {
        subjectCode: 'CUL',
        subjectName: 'Cultural Studies',
        shortName: 'Cultural',
        category: 'Montessori area',
      },
      {
        subjectCode: 'ART',
        subjectName: 'Art and Craft',
        shortName: 'Art',
        category: 'Creative arts',
      },
      {
        subjectCode: 'MUS',
        subjectName: 'Music and Movement',
        shortName: 'Music',
        category: 'Creative arts',
      },
    ],
  },
];
