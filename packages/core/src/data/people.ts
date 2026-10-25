import type { Person } from '../domain/types';

export const people: Person[] = [
  {
    id: 'p-adler',
    name: 'Miriam Adler',
    title: { de: 'Prof. Dr.', en: 'Prof. Dr.' },
    institute: {
      de: 'Fachbereich Künstliche Intelligenz · Demonstration',
      en: 'Artificial intelligence unit · demonstration',
    },
    email: 'miriam.adler@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'adler-office',
    hours: { de: 'Dienstag, 13:00–14:00 Uhr', en: 'Tuesday, 13:00–14:00' },
    research: {
      de: 'Suche, Wissensrepräsentation und Grundlagen intelligenter Agenten.',
      en: 'Search, knowledge representation, and the foundations of intelligent agents.',
    },
  },
  {
    id: 'p-keller',
    name: 'Jonas Keller',
    title: { de: 'Prof. Dr.', en: 'Prof. Dr.' },
    institute: {
      de: 'Fachbereich Betriebssysteme · Demonstration',
      en: 'Operating systems unit · demonstration',
    },
    email: 'jonas.keller@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'keller-office',
    hours: { de: 'Donnerstag, 10:00–11:00 Uhr', en: 'Thursday, 10:00–11:00' },
    research: {
      de: 'Prozesse, Scheduling und Speicherverwaltung in Lehrbetriebssystemen.',
      en: 'Processes, scheduling, and memory management in teaching operating systems.',
    },
  },
  {
    id: 'p-nazari',
    name: 'Farid Nazari',
    title: { de: 'Dr.', en: 'Dr.' },
    institute: {
      de: 'SDG Campus · Schlüsselqualifikationen · Demonstration',
      en: 'SDG Campus · key competencies · demonstration',
    },
    email: 'farid.nazari@demo.uni-stuttgart.test',
    campus: 'stadtmitte',
    roomId: 'kepler11',
    hours: { de: 'Mittwoch, 17:30–18:15 Uhr, nach der Lehrveranstaltung', en: 'Wednesday, 17:30–18:15, after class' },
    research: {
      de: 'Nachhaltigkeit in der Ingenieurausbildung und fachübergreifende Projekte.',
      en: 'Sustainability in engineering education and interdisciplinary projects.',
    },
  },
  {
    id: 'p-otto',
    name: 'Pia Otto',
    title: { de: 'Dr.', en: 'Dr.' },
    institute: {
      de: 'Fachbereich Wissenschaftliches Arbeiten · Demonstration',
      en: 'Academic practice unit · demonstration',
    },
    email: 'pia.otto@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'v47-sem',
    hours: { de: 'Freitag, 13:00–13:45 Uhr', en: 'Friday, 13:00–13:45' },
    research: {
      de: 'Seminarformate, wissenschaftliches Schreiben und Vortragstechnik.',
      en: 'Seminar formats, academic writing, and presentation technique.',
    },
  },
  {
    id: 'p-berg',
    name: 'Ida Berg',
    title: { de: 'Prof. Dr.', en: 'Prof. Dr.' },
    institute: {
      de: 'Fachbereich Mathematik für Informatik · Demonstration',
      en: 'Mathematics for computer science · demonstration',
    },
    email: 'ida.berg@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'keller-office',
    hours: { de: 'Montag, 14:00–15:00 Uhr', en: 'Monday, 14:00–15:00' },
    research: {
      de: 'Analysis, lineare Algebra und numerische Verfahren in der Grundausbildung.',
      en: 'Analysis, linear algebra, and numerical methods in the foundation curriculum.',
    },
  },
  {
    id: 'p-paul',
    name: 'Henrik Paul',
    title: { de: 'Prof. Dr.', en: 'Prof. Dr.' },
    institute: {
      de: 'Fachbereich Theoretische Informatik · Demonstration',
      en: 'Theoretical computer science · demonstration',
    },
    email: 'henrik.paul@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'v38-sem',
    hours: { de: 'Dienstag, 15:00–16:00 Uhr', en: 'Tuesday, 15:00–16:00' },
    research: {
      de: 'Automaten, Berechenbarkeit, Logik und Algorithmik.',
      en: 'Automata, computability, logic, and algorithmics.',
    },
  },
  {
    id: 'p-lorenz',
    name: 'Svenja Lorenz',
    title: { de: 'Prof. Dr.', en: 'Prof. Dr.' },
    institute: {
      de: 'Fachbereich Softwaretechnik · Demonstration',
      en: 'Software engineering unit · demonstration',
    },
    email: 'svenja.lorenz@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'v38-sem',
    hours: { de: 'Mittwoch, 13:00–14:00 Uhr', en: 'Wednesday, 13:00–14:00' },
    research: {
      de: 'Entwurf, Qualitätssicherung und Teamarbeit in Softwareprojekten.',
      en: 'Design, quality assurance, and teamwork in software projects.',
    },
  },
  {
    id: 'p-weiss',
    name: 'Noah Weiss',
    title: { de: 'Dr.', en: 'Dr.' },
    institute: {
      de: 'Fachbereich Technische Informatik · Demonstration',
      en: 'Computer engineering unit · demonstration',
    },
    email: 'noah.weiss@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'adler-office',
    hours: { de: 'Donnerstag, 15:30–16:30 Uhr', en: 'Thursday, 15:30–16:30' },
    research: {
      de: 'Rechnerarchitektur, Netze und systemnahe Programmierung.',
      en: 'Computer architecture, networks, and systems programming.',
    },
  },
  {
    id: 'p-sommer',
    name: 'Klara Sommer',
    title: { de: 'Prof. Dr.', en: 'Prof. Dr.' },
    institute: {
      de: 'Fachbereich Datenbanken · Demonstration',
      en: 'Databases unit · demonstration',
    },
    email: 'klara.sommer@demo.uni-stuttgart.test',
    campus: 'vaihingen',
    roomId: 'v38-sem',
    hours: { de: 'Freitag, 09:00–10:00 Uhr', en: 'Friday, 09:00–10:00' },
    research: {
      de: 'Relationale Modellierung, Anfragen und Transaktionen.',
      en: 'Relational modeling, queries, and transactions.',
    },
  },
];
