import type { Deadline, NewsItem, PastExam, Review, StudyDocument, Tutorial } from '@/src/types';

export const deadlines: Deadline[] = [
  {
    id: 'dl-bs-sheet',
    title: { de: 'Betriebssysteme, Blatt 3', en: 'Operating Systems, sheet 3' },
    detail: {
      de: 'Abgabe der Übungsaufgaben zu Prozessen und Scheduling über ILIAS.',
      en: 'Submit the exercise sheet on processes and scheduling through ILIAS.',
    },
    date: '2026-10-16',
    source: 'ilias',
    moduleId: 'os',
  },
  {
    id: 'dl-ai-task',
    title: { de: 'KI, Programmieraufgabe 1', en: 'AI, programming task 1' },
    detail: {
      de: 'Uninformierte Suche und A* auf einem vorgegebenen Graphen. Abgabe im ILIAS-Kurs.',
      en: 'Uninformed search and A* on a given graph. Submit in the ILIAS course.',
    },
    date: '2026-10-23',
    source: 'ilias',
    moduleId: 'ai',
  },
  {
    id: 'dl-seminar',
    title: { de: 'Seminar, Themenwahl', en: 'Seminar, topic choice' },
    detail: {
      de: 'Thema und zwei Literaturquellen an Dr. Otto melden.',
      en: 'Send the topic and two sources to Dr. Otto.',
    },
    date: '2026-10-27',
    source: 'ilias',
    moduleId: 'seminar',
  },
  {
    id: 'dl-sdg',
    title: { de: 'FÜSQ-Ummeldung SDG Campus', en: 'Key-competency change on SDG Campus' },
    detail: {
      de: 'Letzter Tag, um den Nachhaltigkeitskurs zu wechseln, ohne dass die Belegung hängen bleibt.',
      en: 'Last day to switch the sustainability course without the enrollment sticking.',
    },
    date: '2026-10-30',
    source: 'sdg',
    moduleId: 'sustain',
  },
  {
    id: 'dl-exam-open',
    title: { de: 'Prüfungsanmeldung öffnet', en: 'Exam registration opens' },
    detail: {
      de: 'Anmeldung in C@MPUS für die Prüfungen dieses Wintersemesters, darunter KI und Betriebssysteme.',
      en: 'Registration in C@MPUS for this winter semester, including AI and Operating Systems.',
    },
    date: '2026-11-02',
    source: 'campus',
  },
  {
    id: 'dl-exam-close',
    title: { de: 'Prüfungsanmeldung endet', en: 'Exam registration closes' },
    detail: {
      de: 'Letzter Tag der Anmeldung in C@MPUS. Danach ist eine Anmeldung im Demonstrationsplan nicht mehr vorgesehen.',
      en: 'Last day to register in C@MPUS. After this, the demonstration plan has no further registration.',
    },
    date: '2026-11-16',
    source: 'campus',
  },
  {
    id: 'dl-rueck',
    title: { de: 'Rückmeldung Sommersemester', en: 'Re-registration for summer semester' },
    detail: {
      de: 'Semesterbeitrag für das Sommersemester 2027. Der genaue Betrag kommt vom Studierendensekretariat.',
      en: 'Semester fee for summer 2027. The exact amount comes from student administration.',
    },
    date: '2027-01-15',
    source: 'faculty',
  },
  {
    id: 'dl-ai-exam',
    title: { de: 'Klausur Künstliche Intelligenz', en: 'Artificial Intelligence exam' },
    detail: {
      de: 'Schriftliche Prüfung, 90 Minuten. Hörsaal wird in C@MPUS nach der Anmeldung gesetzt.',
      en: 'Written exam, 90 minutes. C@MPUS assigns the hall after registration.',
    },
    date: '2027-02-18',
    source: 'campus',
    moduleId: 'ai',
  },
  {
    id: 'dl-os-exam',
    title: { de: 'Klausur Betriebssysteme', en: 'Operating Systems exam' },
    detail: {
      de: 'Schriftliche Prüfung, 90 Minuten.',
      en: 'Written exam, 90 minutes.',
    },
    date: '2027-02-24',
    source: 'campus',
    moduleId: 'os',
  },
];

export const news: NewsItem[] = [
  {
    id: 'news-campus',
    source: 'university',
    title: {
      de: 'Prüfungsanmeldung Wintersemester in C@MPUS',
      en: 'Winter exam registration in C@MPUS',
    },
    summary: {
      de: 'Die Anmeldung für die Klausuren des Wintersemesters läuft vom 2. bis 16. November.',
      en: 'Registration for the winter exams runs from 2 to 16 November.',
    },
    body: {
      de: 'C@MPUS öffnet die Prüfungsanmeldung am 2. November und schließt sie am 16. November. Wer eine Prüfung nicht anmeldet, steht im Demonstrationsplan nicht auf der Teilnehmerliste. Abmelderegeln bleiben in der Prüfungsordnung des eigenen Studiengangs.',
      en: 'C@MPUS opens exam registration on 2 November and closes it on 16 November. A student who does not register is not on the participant list in the demonstration plan. Withdrawal rules stay in the examination regulations of the degree program.',
    },
    date: '2026-10-08',
  },
  {
    id: 'news-stuvus',
    source: 'stuvus',
    title: {
      de: 'Fachgruppenabend Informatik',
      en: 'Computer science student-group evening',
    },
    summary: {
      de: 'stuvus und die Fachgruppe laden am 21. Oktober in den Lernbereich V38.',
      en: 'stuvus and the student group meet on 21 October in the V38 study area.',
    },
    body: {
      de: 'Die Fachgruppe Informatik trifft sich mit stuvus am 21. Oktober um 18:30 Uhr im Lernbereich der Universitätsstraße 38. Thema sind Prüfungslast und die Wunschliste für Übungsgruppen. stuvus ist die Studierendenvertretung der Universität Stuttgart.',
      en: 'The computer science student group meets stuvus on 21 October at 18:30 in the study area at Universitätsstraße 38. The topic is exam load and the wish list for exercise groups. stuvus is the student representation of the University of Stuttgart.',
    },
    date: '2026-10-10',
  },
  {
    id: 'news-faculty',
    source: 'faculty',
    title: {
      de: 'Hörsaalwechsel für große Fakultätsveranstaltungen',
      en: 'Hall change for large faculty events',
    },
    summary: {
      de: 'Fakultät 5 verlegt die nächste Vollversammlung von K II nach K I.',
      en: 'Faculty 5 moves the next assembly from K II to K I.',
    },
    body: {
      de: 'Die Fakultät 5 weist darauf hin, dass die Vollversammlung am 29. Oktober im Hörsaal K I stattfindet, nicht in K II. Einzelne Lehrveranstaltungen bleiben in ihren Räumen. Der persönliche Stundenplan in dieser App ist davon nicht betroffen.',
      en: 'Faculty 5 notes that the assembly on 29 October is in lecture hall K I, not K II. Individual classes stay in their rooms. The personal timetable in this app is unchanged.',
    },
    date: '2026-10-11',
  },
  {
    id: 'news-institute',
    source: 'institute',
    title: {
      de: 'ILIAS: Forenhinweis zum KI-Blatt',
      en: 'ILIAS: forum note on the AI sheet',
    },
    summary: {
      de: 'Die Testgraphen für Programmieraufgabe 1 stehen seit Montag im Kurs.',
      en: 'The test graphs for programming task 1 have been in the course since Monday.',
    },
    body: {
      de: 'Im ILIAS-Forum der KI-Grundlagen liegt der Hinweis, dass die öffentlichen Testgraphen die Abgabe nicht ersetzen. A* soll mit einer konsistenten Heuristik implementiert werden. Fragen zum Blatt sammelt das Forum bis zum Abgabetag.',
      en: 'The ILIAS forum for the AI foundations notes that the public test graphs do not replace the submission. A* should be implemented with a consistent heuristic. The forum collects questions until the due date.',
    },
    date: '2026-10-12',
  },
  {
    id: 'news-sdg',
    source: 'sdg',
    title: {
      de: 'Neuer FÜSQ-Kurs: Klimakommunikation',
      en: 'New key-competency course: climate communication',
    },
    summary: {
      de: 'Der SDG Campus hat einen Kurs mit 3 ECTS für das Sommersemester vorgemerkt.',
      en: 'SDG Campus has listed a three-credit course for the summer semester.',
    },
    body: {
      de: 'Neben dem belegten Nachhaltigkeitskurs erscheint im SDG Campus ein Angebot zur Klimakommunikation mit 3 ECTS. Es kann eine spätere Schlüsselqualifikation werden, ersetzt aber nicht die laufende Belegung. Die Ummeldefrist für das aktuelle Modul endet am 30. Oktober.',
      en: 'Beside the enrolled sustainability course, SDG Campus lists a climate-communication offer worth 3 ECTS. It can become a later key competency, and it does not replace the current enrollment. The change deadline for the current module is 30 October.',
    },
    date: '2026-10-09',
  },
];

export const documents: StudyDocument[] = [
  {
    id: 'doc-ki',
    title: { de: 'KI, Folien Woche 3 · Suche', en: 'AI, week 3 slides · search' },
    courseId: 'ai',
    source: 'ilias',
    folder: { de: 'Vorlesung', en: 'Lectures' },
    updated: '2026-10-07',
    author: 'Prof. Dr. Miriam Adler',
    pages: {
      de: [
        'Woche 3 behandelt Suchprobleme. Ein Problem besteht aus Zustand, Aktionen, Kosten und Zieltest. Die Lösung ist ein Pfad, nicht ein einzelner Knoten.',
        'Breitensuche expandiert Ebene für Ebene und findet bei gleichen Kosten einen kürzesten Pfad. Tiefensuche braucht weniger Speicher und kann in tiefen Ästen hängen.',
        'A* sortiert die Randmenge nach f(n) = g(n) + h(n). Ist die Heuristik zulässig, überschätzt sie die Restkosten nicht. Ist sie konsistent, ist die erste Zielentnahme optimal.',
        'Auf dem Übungsgraphen ist die Luftlinie eine zulässige Heuristik. Die Programmieraufgabe verlangt Breitensuche und A* auf derselben Kantenliste.',
      ],
      en: [
        'Week 3 covers search problems. A problem has a state, actions, costs, and a goal test. The solution is a path, not a single node.',
        'Breadth-first search expands level by level and finds a shortest path when step costs are equal. Depth-first search uses less memory and can get stuck in a deep branch.',
        'A* orders the frontier by f(n) = g(n) + h(n). If the heuristic is admissible, it never overestimates the remaining cost. If it is consistent, the first time the goal is removed from the frontier, the path is optimal.',
        'On the exercise graph, straight-line distance is an admissible heuristic. The programming task asks for breadth-first search and A* on the same edge list.',
      ],
    },
  },
  {
    id: 'doc-os',
    title: { de: 'Betriebssysteme, Blatt 3', en: 'Operating Systems, sheet 3' },
    courseId: 'os',
    source: 'ilias',
    folder: { de: 'Übungen', en: 'Exercises' },
    updated: '2026-10-06',
    author: 'Prof. Dr. Jonas Keller',
    pages: {
      de: [
        'Blatt 3 betrachtet Prozesse und den Scheduler. Ein Prozess hat einen Adressraum, offene Dateien und mindestens einen Thread.',
        'Round Robin gibt jedem bereiten Prozess eine Zeitscheibe. Eine kürzere Scheibe senkt die Antwortzeit und erhöht die Wechselkosten.',
        'Die Aufgabe verlangt eine kleine Tabelle: Ankunft, Dauer, Start und Ende für FCFS und Round Robin mit Scheibe 2.',
        'Abgabe als PDF bis 16. Oktober, 18:00 Uhr, im ILIAS-Übungsordner der eigenen Gruppe.',
      ],
      en: [
        'Sheet 3 looks at processes and the scheduler. A process has an address space, open files, and at least one thread.',
        'Round robin gives every ready process a time slice. A shorter slice lowers response time and raises switch cost.',
        'The task asks for a small table: arrival, burst, start, and finish for FCFS and for round robin with slice 2.',
        'Submit a PDF by 16 October, 18:00, in the ILIAS exercise folder of your group.',
      ],
    },
  },
  {
    id: 'doc-seminar',
    title: { de: 'Seminar, Themenliste', en: 'Seminar, topic list' },
    courseId: 'seminar',
    source: 'ilias',
    folder: { de: 'Organisation', en: 'Organisation' },
    updated: '2026-10-05',
    author: 'Dr. Pia Otto',
    pages: {
      de: [
        'Jedes Thema darf einmal vergeben werden. Die Meldung braucht einen Arbeitstitel und zwei Quellen, davon eine Übersicht.',
        'Offene Themen: Testheuristiken, energiearme Rechenzentren, Barrierefreiheit von Lernplattformen.',
        'Die Ausarbeitung hat 8 bis 10 Seiten. Der Vortrag dauert 15 Minuten plus Fragen.',
      ],
      en: [
        'Each topic can be taken once. The registration needs a working title and two sources, one of them a survey.',
        'Open topics: test heuristics, low-energy data centers, accessibility of learning platforms.',
        'The paper is 8 to 10 pages. The talk is 15 minutes plus questions.',
      ],
    },
  },
  {
    id: 'doc-peer-dsa',
    title: { de: 'Notiz: Graphen in DSA', en: 'Note: graphs in DSA' },
    courseId: 'dsa',
    source: 'peer',
    folder: { de: 'Geteilte Notizen', en: 'Shared notes' },
    updated: '2026-02-12',
    author: 'Mara K.',
    pages: {
      de: [
        'Für die DSA-Klausur haben sich BFS, DFS, Dijkstra und die Union-Find-Struktur gelohnt. Hashing kam als kurze Rechnung.',
        'Ich habe die Invarianten von Union-Find auf eine Karteikarte geschrieben und die Laufzeiten daneben gestellt.',
        'Die schweren Aufgaben waren Beweise zur Korrektheit, nicht das Ausrechnen eines einzelnen Pfads.',
      ],
      en: [
        'For the DSA exam, BFS, DFS, Dijkstra, and the union-find structure were worth the time. Hashing appeared as a short calculation.',
        'I put the union-find invariants on one card and the running times beside them.',
        'The hard tasks were correctness arguments, not computing a single path.',
      ],
    },
  },
];

export const reviews: Review[] = [
  {
    id: 'rev-hci-1',
    moduleId: 'hci',
    author: 'Jonas P.',
    term: 'SoSe 2026',
    rating: 4.6,
    workload: 6,
    difficulty: 2,
    comment: {
      de: 'Viel Prototyp, wenig Auswendiglernen. Der Aufwand blieb unter einer Kernvorlesung, die Projektabgabe braucht aber ein festes Team.',
      en: 'Lots of prototyping, little memorization. The load stayed under a core lecture, but the project needs a stable team.',
    },
  },
  {
    id: 'rev-hci-2',
    moduleId: 'hci',
    author: 'Aylin S.',
    term: 'SoSe 2026',
    rating: 4.2,
    workload: 7,
    difficulty: 2,
    comment: {
      de: 'Gut neben einem schweren Wahlmodul. Die Bewertung ist transparent, wenn man die Nutzungsziele früh aufschreibt.',
      en: 'Works beside a heavy elective. Grading is transparent if you write the usage goals down early.',
    },
  },
  {
    id: 'rev-sec-1',
    moduleId: 'sec',
    author: 'Erik N.',
    term: 'WiSe 2025',
    rating: 4.4,
    workload: 9,
    difficulty: 4,
    comment: {
      de: 'Rechnernetze sollte sitzen. Die Klausur fragt Modelle, nicht Tool-Bedienung. Arbeitskreis lohnt sich ab November.',
      en: 'Computer Networks should be solid. The exam asks for models, not tool use. A study group is worth it from November.',
    },
  },
  {
    id: 'rev-ml-1',
    moduleId: 'ml',
    author: 'Sara L.',
    term: 'SoSe 2026',
    rating: 4.5,
    workload: 11,
    difficulty: 4,
    comment: {
      de: 'Erst nach den KI-Grundlagen belegbar und dann auch sinnvoll. Wer Stochastik nur knapp bestanden hat, sollte die ersten zwei Wochen wiederholen.',
      en: 'Only worth taking after the AI foundations. Anyone who barely passed probability should redo the first two weeks.',
    },
  },
  {
    id: 'rev-compiler-1',
    moduleId: 'compiler',
    author: 'Tim W.',
    term: 'WiSe 2025',
    rating: 3.4,
    workload: 12,
    difficulty: 5,
    comment: {
      de: 'Spannend, aber das Projekt frisst die vorlesungsfreie Zeit, wenn der Parser zu spät steht. Nicht parallel zur Bachelorarbeit.',
      en: 'Interesting, but the project eats the break if the parser is late. Not in parallel with the thesis.',
    },
  },
  {
    id: 'rev-ki-1',
    moduleId: 'ai',
    author: 'Lea M.',
    term: 'WiSe 2025',
    rating: 4.3,
    workload: 8,
    difficulty: 3,
    comment: {
      de: 'Die Suche ist der Einstieg, die Logik der Teil, den viele unterschätzen. Altklausuren helfen bei der Aufgabenform, nicht als Lösungssatz.',
      en: 'Search is the entry, logic is the part many underestimate. Past topics help with the task shape, not as an answer key.',
    },
  },
];

export const exams: PastExam[] = [
  {
    id: 'ex-ai',
    moduleId: 'ai',
    term: 'WiSe 2025/26',
    topics: {
      de: ['Breitensuche auf einem kleinen Graphen', 'A* mit zulässiger Heuristik', 'Modellierung in Aussagenlogik', 'Eine Frage zu bedingter Wahrscheinlichkeit'],
      en: ['Breadth-first search on a small graph', 'A* with an admissible heuristic', 'Modeling in propositional logic', 'One question on conditional probability'],
    },
    focus: {
      de: 'Suche und Logik trugen den größten Teil der Punkte. Bayes war eine einzelne Aufgabe.',
      en: 'Search and logic carried most of the points. Bayes was a single task.',
    },
    hint: {
      de: 'Übe, eine Heuristik als zulässig zu begründen, nicht nur f-Werte auszurechnen.',
      en: 'Practice arguing that a heuristic is admissible, not only computing f-values.',
    },
  },
  {
    id: 'ex-os',
    moduleId: 'os',
    term: 'WiSe 2025/26',
    topics: {
      de: ['Prozesszustände', 'FCFS und Round Robin', 'Seitenfehler', 'Eine Verklemmung mit vier Betriebsmitteln'],
      en: ['Process states', 'FCFS and round robin', 'Page faults', 'A deadlock with four resources'],
    },
    focus: {
      de: 'Scheduling-Tabellen und eine Verklemmungsbegründung kamen beide vor.',
      en: 'Both a scheduling table and a deadlock argument appeared.',
    },
    hint: {
      de: 'Schreibe die Zeitscheibe in die Kopfzeile der Tabelle, sonst verrutschen die Wechsel.',
      en: 'Write the time slice in the table header, or the switches drift.',
    },
  },
  {
    id: 'ex-dsa',
    moduleId: 'dsa',
    term: 'SoSe 2026',
    topics: {
      de: ['AVL-Rotation', 'Dijkstra', 'Hashing mit Sondieren', 'Eine O-Notation-Begründung'],
      en: ['AVL rotation', 'Dijkstra', 'Hashing with probing', 'A big-O argument'],
    },
    focus: {
      de: 'Graphen und Bäume waren der Kern. Hashing war kurz.',
      en: 'Graphs and trees were the core. Hashing was short.',
    },
    hint: {
      de: 'Die Notiz von Mara zu Union-Find passt auf ältere Aufgaben, in diesem Termin kam es nicht dran.',
      en: 'Mara’s union-find note fits older papers. This sitting did not ask for it.',
    },
  },
  {
    id: 'ex-swt',
    moduleId: 'swt',
    term: 'SoSe 2026',
    topics: {
      de: ['Anforderung und Abnahmekriterium', 'Ein Sequenzdiagramm', 'Review-Befund klassifizieren'],
      en: ['A requirement and an acceptance criterion', 'One sequence diagram', 'Classify a review finding'],
    },
    focus: {
      de: 'Keine Programmieraufgabe. Gefragt war, ob ein Entwurf zur Anforderung passt.',
      en: 'No programming task. The question was whether a design matches a requirement.',
    },
    hint: {
      de: 'Trenne Nutzerziel und technische Lösung in zwei Sätzen.',
      en: 'Separate the user goal and the technical solution in two sentences.',
    },
  },
];

export const tutorials: Tutorial[] = [
  {
    id: 'tut-ai-2',
    moduleId: 'ai',
    group: 'Gruppe 2',
    day: 4,
    start: '14:00',
    end: '15:30',
    roomId: 'v47-ue',
    seats: 30,
    taken: 28,
    enrolled: true,
    tutor: 'Lea Hoffmann',
  },
  {
    id: 'tut-ai-5',
    moduleId: 'ai',
    group: 'Gruppe 5',
    day: 4,
    start: '15:45',
    end: '17:15',
    roomId: 'v38-ue',
    seats: 30,
    taken: 19,
    enrolled: false,
    tutor: 'Armin Böhm',
  },
  {
    id: 'tut-os-b',
    moduleId: 'os',
    group: 'Gruppe B',
    day: 3,
    start: '09:45',
    end: '11:15',
    roomId: 'v38-ue',
    seats: 24,
    taken: 22,
    enrolled: true,
    tutor: 'Selin Aydin',
  },
  {
    id: 'tut-os-c',
    moduleId: 'os',
    group: 'Gruppe C',
    day: 3,
    start: '11:30',
    end: '13:00',
    roomId: 'v38-ue',
    seats: 24,
    taken: 16,
    enrolled: false,
    tutor: 'Jonas Hertel',
  },
  {
    id: 'tut-sq',
    moduleId: 'sustain',
    group: 'Seminar',
    day: 3,
    start: '15:45',
    end: '17:15',
    roomId: 'k1',
    seats: 40,
    taken: 33,
    enrolled: true,
    tutor: 'Dr. Farid Nazari',
  },
];
