import type { QuizTopic } from '@/src/quiz/types';

import { l } from '../helpers';

export const pragOrganisation: QuizTopic = {
  id: 'prag-organisation',
  title: l('Organisation, Lektüre & Prüfung', 'Organisation, reading & exam'),
  meeting: l('1. Sitzung · 12. Oktober 2026', 'Session 1 · 12 October 2026'),
  summary: l(
    'Dozent, Sprechstunde, Lehrbuch, Semesterthemen und Prüfungsleistung im Überblick – die organisatorischen Grundlagen des Seminars.',
    'Lecturer, office hours, textbook, semester topics, and exam requirements at a glance – the organisational foundations of the seminar.',
  ),
  source: l(
    'Pragmatik I · Organisatorisches zur ersten Sitzung',
    'Pragmatics I · Organisational matters from the first session',
  ),
  questions: [
    {
      id: 'prag-org-dozent',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wer lehrt Pragmatik I im Wintersemester 2026/27?',
        'Who teaches Pragmatics I in the winter semester 2026/27?',
      ),
      options: [
        { id: 'a', label: l('Fabian Dirscherl', 'Fabian Dirscherl') },
        { id: 'b', label: l('Christian Martin', 'Christian Martin') },
        { id: 'c', label: l('Paul Grice', 'Paul Grice') },
        { id: 'd', label: l('John R. Searle', 'John R. Searle') },
      ],
      correctId: 'a',
      explanation: l(
        'Fabian Dirscherl ist wissenschaftlicher Mitarbeiter am Institut für Linguistik und lehrt Pragmatik I.',
        'Fabian Dirscherl is a research associate at the Institute of Linguistics and teaches Pragmatics I.',
      ),
    },
    {
      id: 'prag-org-pruefung',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Welche Prüfungsleistung ist im Seminar vorgesehen?',
        'What form of examination is planned for the seminar?',
      ),
      options: [
        {
          id: 'a',
          label: l('Eine schriftliche Klausur von 90 Minuten, mit zwei Terminen.', 'A 90-minute written exam, offered on two dates.'),
        },
        { id: 'b', label: l('Eine mündliche Prüfung von 30 Minuten.', 'A 30-minute oral exam.') },
        { id: 'c', label: l('Eine Hausarbeit ohne Klausur.', 'A term paper instead of an exam.') },
        { id: 'd', label: l('Nur eine Anwesenheitsliste.', 'Only an attendance list.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die Prüfungsleistung ist eine 90-minütige schriftliche Klausur. Es werden zwei Termine angeboten.',
        'The examination is a 90-minute written exam. Two dates are offered.',
      ),
    },
    {
      id: 'prag-org-themen',
      kind: 'multiple',
      difficulty: 1,
      prompt: l(
        'Welche Themen stehen laut Semesterübersicht auf dem Programm?',
        'Which topics are on the semester overview?',
      ),
      options: [
        { id: 'a', label: l('Implikaturen', 'Implicatures') },
        { id: 'b', label: l('Präsuppositionen', 'Presuppositions') },
        { id: 'c', label: l('Sprechakte', 'Speech acts') },
        { id: 'd', label: l('Höflichkeit', 'Politeness') },
        { id: 'e', label: l('Verbale Aggression', 'Verbal aggression') },
        { id: 'f', label: l('Magische Sprechakte', 'Magical speech acts') },
        { id: 'g', label: l('Phonologie', 'Phonology') },
        { id: 'h', label: l('Morphologie', 'Morphology') },
      ],
      correctIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      explanation: l(
        'Die Übersicht nennt Implikaturen, Präsuppositionen, Sprechakte und Höflichkeit sowie zur Vertiefung verbale Aggression und magische Sprechakte. Phonologie und Morphologie gehören nicht dazu.',
        'The overview lists implicatures, presuppositions, speech acts, and politeness, plus verbal aggression and magical speech acts for further study. Phonology and morphology are not part of it.',
      ),
    },
    {
      id: 'prag-org-lehrbuch',
      kind: 'single',
      difficulty: 2,
      prompt: l(
        'Welches Lehrbuch wird als grundsätzliche Lektüre genannt?',
        'Which textbook is named as the basic reading?',
      ),
      options: [
        {
          id: 'a',
          label: l('Huang, Yan: Pragmatics. Oxford University Press, 2. Auflage.', 'Huang, Yan: Pragmatics. Oxford University Press, 2nd edition.'),
        },
        {
          id: 'b',
          label: l('Chomsky, Noam: Syntactic Structures. Mouton.', 'Chomsky, Noam: Syntactic Structures. Mouton.'),
        },
        {
          id: 'c',
          label: l('Saussure, Ferdinand de: Cours de linguistique générale.', 'Saussure, Ferdinand de: Cours de linguistique générale.'),
        },
        {
          id: 'd',
          label: l('Bloomfield, Leonard: Language. Holt.', 'Bloomfield, Leonard: Language. Holt.'),
        },
      ],
      correctId: 'a',
      explanation: l(
        'Grundlage ist Huang, Yan (2. Aufl. 2014): Pragmatics. Oxford: Oxford University Press. Die 2. Auflage ist in der UB erhältlich, Scans stehen auf ILIAS.',
        'The basis is Huang, Yan (2nd ed. 2014): Pragmatics. Oxford: Oxford University Press. The 2nd edition is available in the university library, and scans are on ILIAS.',
      ),
    },
    {
      id: 'prag-org-ilias',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Die Scans auf ILIAS sollten bis zum 31.12.2026 heruntergeladen werden.',
        'The scans on ILIAS should be downloaded by 31 December 2026.',
      ),
      correct: true,
      explanation: l(
        'Im Seminar wurde ausdrücklich darauf hingewiesen, die Materialien bis zum 31.12.2026 herunterzuladen.',
        'The seminar explicitly asked students to download the materials by 31 December 2026.',
      ),
    },
    {
      id: 'prag-org-sprechstunde',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wann findet die offene Sprechstunde statt?',
        'When does the open office hour take place?',
      ),
      options: [
        { id: 'a', label: l('Donnerstags von 14 bis 16 Uhr.', 'Thursdays from 2 to 4 p.m.') },
        { id: 'b', label: l('Montags von 8 bis 10 Uhr.', 'Mondays from 8 to 10 a.m.') },
        { id: 'c', label: l('Freitags von 16 bis 18 Uhr.', 'Fridays from 4 to 6 p.m.') },
        { id: 'd', label: l('Jeden ersten Mittwoch im Monat.', 'Every first Wednesday of the month.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die offene Sprechstunde ist donnerstags von 14 bis 16 Uhr – im virtuellen Raum oder nach kurzer Anmeldung im Büro.',
        'The open office hour is Thursdays from 2 to 4 p.m. – in the virtual room or, after a short notice, in the office.',
      ),
    },
    {
      id: 'prag-org-webex',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Was ist bei der Sprechstunde zu beachten?',
        'What should be kept in mind for the office hour?',
      ),
      options: [
        {
          id: 'a',
          label: l('Im virtuellen Raum bitte pünktlich um 14 Uhr in der Lobby warten.', 'In the virtual room, please wait in the lobby punctually at 2 p.m.'),
        },
        {
          id: 'b',
          label: l('Für einen Besuch im Büro kurz vorher Bescheid geben und einen Termin vereinbaren.', 'For an office visit, give brief notice beforehand and arrange an appointment.'),
        },
        { id: 'c', label: l('Die Sprechstunde ist nur mit vorheriger Klausuranmeldung möglich.', 'The office hour is only available after registering for the exam.') },
        { id: 'd', label: l('Fragen sind ausschließlich per Post erlaubt.', 'Questions are only allowed by post.') },
      ],
      correctIds: ['a', 'b'],
      explanation: l(
        'Für den virtuellen Raum gilt: pünktlich um 14 Uhr in der Lobby warten. Für das Büro gilt: kurz Bescheid geben, damit ein Termin vergeben werden kann und keine Warteschlange entsteht.',
        'For the virtual room: wait in the lobby punctually at 2 p.m. For the office: give brief notice so that an appointment can be arranged and no queue forms.',
      ),
    },
    {
      id: 'prag-org-lerntandems',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Die Lerntandems werden bereits in der ersten Sitzung endgültig zugewiesen.',
        'The learning tandems are finally assigned during the first session.',
      ),
      correct: false,
      explanation: l(
        'Die Lerntandems werden erst zur nächsten Sitzung zugewiesen.',
        'The learning tandems are assigned only for the next session.',
      ),
    },
    {
      id: 'prag-org-klassiker',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche Klassiker werden zur Vertiefung genannt?',
        'Which classics are named for further reading?',
      ),
      options: [
        { id: 'a', label: l('H. P. Grice', 'H. P. Grice') },
        { id: 'b', label: l('J. R. Searle', 'J. R. Searle') },
        { id: 'c', label: l('J. L. Austin', 'J. L. Austin') },
        { id: 'd', label: l('Ferdinand de Saussure', 'Ferdinand de Saussure') },
        { id: 'e', label: l('Noam Chomsky', 'Noam Chomsky') },
      ],
      correctIds: ['a', 'b', 'c'],
      explanation: l(
        'Auszüge aus den Klassikern von Grice, Searle und Austin stehen auf ILIAS zur Verfügung.',
        'Excerpts from the classics by Grice, Searle, and Austin are available on ILIAS.',
      ),
    },
    {
      id: 'prag-org-ort',
      kind: 'single',
      difficulty: 1,
      prompt: l(
        'Wo findet die erste Sitzung statt?',
        'Where does the first session take place?',
      ),
      options: [
        { id: 'a', label: l('In M2.01.', 'In M2.01.') },
        { id: 'b', label: l('In der Universitätsbibliothek.', 'In the university library.') },
        { id: 'c', label: l('Im Webex-Raum.', 'In the Webex room.') },
        { id: 'd', label: l('In einem Hörsaal der Fakultät 9.', 'In a lecture hall of Faculty 9.') },
      ],
      correctId: 'a',
      explanation: l(
        'Die erste Sitzung am 12.10.2026 findet in M2.01 statt.',
        'The first session on 12 October 2026 takes place in M2.01.',
      ),
    },
  ],
};
