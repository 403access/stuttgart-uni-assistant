import type { Program, StudentProfile } from '../domain/types';

export const program: Program = {
  id: 'bsc-inf',
  title: { de: 'Informatik', en: 'Computer Science' },
  degree: { de: 'Bachelor of Science', en: 'Bachelor of Science' },
  totalEcts: 180,
  standardSemesterEcts: 30,
  areas: [
    { id: 'math', ects: 30, title: { de: 'Mathematik', en: 'Mathematics' } },
    { id: 'theory', ects: 18, title: { de: 'Theoretische Informatik', en: 'Theoretical computer science' } },
    { id: 'practical', ects: 24, title: { de: 'Praktische Informatik', en: 'Practical computer science' } },
    { id: 'systems', ects: 18, title: { de: 'Technische Informatik', en: 'Computer engineering' } },
    { id: 'core', ects: 18, title: { de: 'Kernmodule', en: 'Core modules' } },
    { id: 'elective', ects: 24, title: { de: 'Ergänzungsmodule', en: 'Electives' } },
    { id: 'sq', ects: 18, title: { de: 'Schlüsselqualifikationen', en: 'Key competencies' } },
    { id: 'project', ects: 18, title: { de: 'Projekt und Praktikum', en: 'Project and internship' } },
    { id: 'thesis', ects: 12, title: { de: 'Bachelorarbeit', en: 'Bachelor thesis' } },
  ],
};

export const student: StudentProfile = {
  name: 'Lena Hartmann',
  account: 'st123456',
  matriculation: '4123456',
  semester: 5,
  email: 'lena.hartmann@demo.uni-stuttgart.test',
  faculty: {
    de: 'Fakultät 5 · Informatik, Elektrotechnik und Informationstechnik',
    en: 'Faculty 5 · Computer Science, Electrical Engineering and Information Technology',
  },
  campusHome: 'vaihingen',
};
