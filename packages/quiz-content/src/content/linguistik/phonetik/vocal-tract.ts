import {
  HEAD_VIEW_BOX,
  vocalTractFigure,
  vocalTractRegions,
} from '../../../figures/vocal-tract';
import type { QuizTopic } from '../../../types.ts';

import { l } from '../../helpers';

/**
 * The head/vocal-tract topic. Every diagram question reuses the same labelled
 * figure that the topic screen shows above the round options, so learners can
 * study the exact illustration they are asked about.
 */
export const bppVocalTract: QuizTopic = {
  id: 'bpp-vocal-tract',
  title: l('Der Kopf: Artikulatoren', 'The head: articulators'),
  meeting: l('Sitzung 1 · 15.10.2026', 'Session 1 · 15 Oct 2026'),
  summary: l(
    'Nasen-, Mund- und Rachenhöhle, Zunge, Gaumen, Velum, Kehlkopf und Luftröhre im Sagittalschnitt – mit Schaubild und Hotspot-Fragen.',
    'Nasal, oral and pharyngeal cavities, tongue, palate, velum, larynx and trachea in sagittal section – with a reference diagram and hotspot questions.',
  ),
  source: l(
    'Basic Phonetics and Phonology · Dr. Yulia Zuban · Universität Stuttgart',
    'Basic Phonetics and Phonology · Dr. Yulia Zuban · University of Stuttgart',
  ),
  figure: vocalTractFigure,
  questions: [
    {
      id: 'bpp-diagram-velum',
      kind: 'diagram',
      difficulty: 2,
      prompt: l(
        'Tippe im Schaubild auf das Velum (den weichen Gaumen).',
        'Tap the velum (soft palate) in the diagram.',
      ),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['velum'],
      explanation: l(
        'Das Velum ist der bewegliche hintere Teil des Gaumens. Es öffnet und schließt den Zugang zur Nasenhöhle.',
        'The velum is the movable back part of the palate. It opens and closes the entrance to the nasal cavity.',
      ),
    },
    {
      id: 'bpp-diagram-alveolar',
      kind: 'diagram',
      difficulty: 2,
      prompt: l(
        'Tippe auf den Zahndamm (Alveolar Ridge), also den Wulst direkt hinter den oberen Schneidezähnen.',
        'Tap the alveolar ridge, the bump directly behind the upper front teeth.',
      ),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['alveolar-ridge'],
      explanation: l(
        'Der Zahndamm ist der passive Artikulator hinter den oberen Zähnen. An ihm entstehen z. B. [t], [d], [s] und [n].',
        'The alveolar ridge is the passive articulator behind the upper teeth. Sounds such as [t], [d], [s] and [n] are made there.',
      ),
    },
    {
      id: 'bpp-diagram-larynx',
      kind: 'diagram',
      difficulty: 1,
      prompt: l('Tippe auf den Kehlkopf (Larynx).', 'Tap the larynx (voice box).'),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['larynx'],
      explanation: l(
        'Der Kehlkopf sitzt oben an der Luftröhre. In ihm liegen die Stimmlippen.',
        'The larynx sits at the top of the trachea. The vocal cords are located inside it.',
      ),
    },
    {
      id: 'bpp-diagram-nasal',
      kind: 'diagram',
      difficulty: 1,
      prompt: l('Tippe auf die Nasenhöhle.', 'Tap the nasal cavity.'),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['nasal-cavity'],
      explanation: l(
        'Die Nasenhöhle liegt über dem Gaumen. Bei gesenktem Velum strömt die Luft auch durch sie hindurch.',
        'The nasal cavity lies above the palate. When the velum is lowered, air flows through it as well.',
      ),
    },
    {
      id: 'bpp-diagram-uvula',
      kind: 'diagram',
      difficulty: 2,
      prompt: l('Tippe auf das Zäpfchen (Uvula).', 'Tap the uvula.'),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['uvula'],
      explanation: l(
        'Die Uvula hängt am hinteren Ende des Velums. Sie ist ein passiver Artikulator.',
        'The uvula hangs from the back end of the velum. It is a passive articulator.',
      ),
    },
    {
      id: 'bpp-diagram-pharynx',
      kind: 'diagram',
      difficulty: 2,
      prompt: l('Tippe auf den Rachen (Pharynx).', 'Tap the pharynx (throat).'),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['pharynx'],
      explanation: l(
        'Der Rachen ist das muskulöse Rohr zwischen Kehlkopf und Mund-/Nasenhöhle.',
        'The pharynx is the muscular tube between the larynx and the oral/nasal cavities.',
      ),
    },
    {
      id: 'bpp-diagram-cords',
      kind: 'diagram',
      difficulty: 2,
      prompt: l('Tippe auf die Stimmlippen.', 'Tap the vocal cords.'),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['vocal-cords'],
      explanation: l(
        'Die Stimmlippen liegen im Kehlkopf. Ihre schnelle Öffnung und Schließung erzeugt die Stimme.',
        'The vocal cords sit inside the larynx. Their rapid opening and closing produces voice.',
      ),
    },
    {
      id: 'bpp-diagram-tongue',
      kind: 'diagram',
      difficulty: 1,
      prompt: l('Tippe auf die Zunge.', 'Tap the tongue.'),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['tongue'],
      explanation: l(
        'Die Zunge ist der beweglichste aktive Artikulator. Ihre Form und Lage bestimmen Vokale und viele Konsonanten.',
        'The tongue is the most movable active articulator. Its shape and position determine vowels and many consonants.',
      ),
    },
    {
      id: 'bpp-diagram-oral',
      kind: 'diagram',
      difficulty: 1,
      prompt: l('Tippe auf die Mundhöhle.', 'Tap the oral cavity.'),
      viewBox: HEAD_VIEW_BOX,
      backdrop: vocalTractFigure.backdrop,
      regions: vocalTractRegions,
      correctIds: ['oral-cavity'],
      explanation: l(
        'In der Mundhöhle formen Zunge, Gaumen, Zähne und Lippen den Luftstrom zu Lauten.',
        'In the oral cavity the tongue, palate, teeth and lips shape the airstream into sounds.',
      ),
    },
    {
      id: 'bpp-multiple-active',
      kind: 'multiple',
      difficulty: 2,
      prompt: l(
        'Welche der folgenden Artikulatoren sind aktiv (beweglich)?',
        'Which of the following articulators are active (movable)?',
      ),
      options: [
        { id: 'velum', label: l('Velum', 'Velum') },
        { id: 'tongue', label: l('Zunge', 'Tongue') },
        { id: 'lips', label: l('Lippen', 'Lips') },
        { id: 'jaw', label: l('Unterkiefer', 'Lower jaw') },
        { id: 'ridge', label: l('Zahndamm', 'Alveolar ridge') },
        { id: 'palate', label: l('Harter Gaumen', 'Hard palate') },
      ],
      correctIds: ['velum', 'tongue', 'lips', 'jaw'],
      explanation: l(
        'Aktiv sind Velum, Zunge, Lippen und Unterkiefer – sie bewegen sich. Passiv sind Uvula, harter Gaumen, Zahndamm und Zähne.',
        'Active: velum, tongue, lips and lower jaw – they move. Passive: uvula, hard palate, alveolar ridge and teeth.',
      ),
    },
    {
      id: 'bpp-matching-head',
      kind: 'matching',
      difficulty: 1,
      prompt: l('Ordne die anatomischen Begriffe ihren Beschreibungen zu.', 'Match the anatomical terms with their descriptions.'),
      pairs: [
        {
          id: 'velum',
          left: l('Velum', 'Velum'),
          right: l('weicher, beweglicher Gaumen', 'soft, movable palate'),
        },
        {
          id: 'ridge',
          left: l('Zahndamm', 'Alveolar ridge'),
          right: l('Wulst hinter den oberen Zähnen', 'bump behind the upper teeth'),
        },
        {
          id: 'larynx',
          left: l('Kehlkopf', 'Larynx'),
          right: l('enthält die Stimmlippen', 'contains the vocal cords'),
        },
        {
          id: 'pharynx',
          left: l('Rachen', 'Pharynx'),
          right: l('Rohr zwischen Kehlkopf und Mundhöhle', 'tube between larynx and oral cavity'),
        },
      ],
      explanation: l(
        'Diese vier Strukturen werden im Sagittalschnitt zuerst geprüft.',
        'These four structures are the first ones tested in the sagittal section.',
      ),
    },
    {
      id: 'bpp-tf-velum-raised',
      kind: 'true-false',
      difficulty: 2,
      prompt: l(
        'Bei gehobenem Velum strömt die Luft nur durch die Mundhöhle; die Laute sind oral.',
        'When the velum is raised, air flows only through the oral cavity; the sounds are oral.',
      ),
      correct: true,
      explanation: l(
        'Gehobenes Velum verschließt den Nasenraum → orale Laute. Gesenktes Velum öffnet ihn → nasale Laute.',
        'A raised velum closes off the nasal cavity → oral sounds. A lowered velum opens it → nasal sounds.',
      ),
    },
    {
      id: 'bpp-tf-velum-lowered',
      kind: 'true-false',
      difficulty: 1,
      prompt: l(
        'Bei gesenktem Velum strömt die Luft ausschließlich durch den Mund.',
        'When the velum is lowered, air flows exclusively through the mouth.',
      ),
      correct: false,
      explanation: l(
        'Gesenktes Velum öffnet den Nasenraum: Die Luft strömt (auch) durch die Nase, wie bei [m], [n] und [ŋ].',
        'A lowered velum opens the nasal cavity: air flows (also) through the nose, as in [m], [n] and [ŋ].',
      ),
    },
    {
      id: 'bpp-single-phonatory',
      kind: 'single',
      difficulty: 1,
      prompt: l('Welches System erzeugt die Stimme?', 'Which system produces voice?'),
      options: [
        { id: 'a', label: l('Das respiratorische System', 'The respiratory system') },
        { id: 'b', label: l('Das phonatorische System', 'The phonatory system') },
        { id: 'c', label: l('Das artikulatorische System', 'The articulatory system') },
        { id: 'd', label: l('Das auditorische System', 'The auditory system') },
      ],
      correctId: 'b',
      explanation: l(
        'Respiratorisch = Luftstrom, phonatorisch = Stimme, artikulatorisch = Formung der Laute.',
        'Respiratory = airstream, phonatory = voice, articulatory = shaping of sounds.',
      ),
    },
    {
      id: 'bpp-single-larynx-function',
      kind: 'single',
      difficulty: 3,
      prompt: l(
        'Was ist die primäre (überlebenswichtige) Funktion des Kehlkopfs?',
        'What is the primary (life-sustaining) function of the larynx?',
      ),
      options: [
        { id: 'a', label: l('Die Bildung von Vokalen', 'Producing vowels') },
        {
          id: 'b',
          label: l(
            'Zu verhindern, dass Essen und Trinken in die Luftröhre gelangen',
            'Preventing food and drink from entering the trachea',
          ),
        },
        { id: 'c', label: l('Die Luft zu erwärmen', 'Warming the air') },
        { id: 'd', label: l('Den Luftstrom zu erzeugen', 'Generating the airstream') },
      ],
      correctId: 'b',
      explanation: l(
        'Die Hauptfunktion ist der Schutz der Atemwege. Die Phonation ist die sekundäre Funktion.',
        'The main function is protecting the airway. Phonation is the secondary function.',
      ),
    },
    {
      id: 'bpp-cloze-larynx',
      kind: 'cloze',
      difficulty: 3,
      prompt: l('Vervollständige den Aufbau des Kehlkopfs.', 'Complete the description of the larynx.'),
      segments: [
        {
          type: 'text',
          value: l(
            'Der Kehlkopf ist ein kastenförmiger Bau aus einer Reihe von ',
            'The larynx is a box-like structure made of a series of ',
          ),
        },
        { type: 'blank', accepted: ['Knorpeln', 'Knorpel', 'cartilages', 'cartilage'], width: 110 },
        {
          type: 'text',
          value: l('. In ihm liegen die ', '. Inside it are the '),
        },
        { type: 'blank', accepted: ['Stimmlippen', 'Stimmbänder', 'vocal cords', 'vocal folds'], width: 140 },
        {
          type: 'text',
          value: l(', die die Stimme erzeugen.', ', which produce the voice.'),
        },
      ],
      explanation: l(
        'Kehlkopf = Knorpelgerüst + Stimmlippen. Die Stimmlippen öffnen und schließen sich schnell.',
        'Larynx = cartilage framework + vocal cords. The vocal cords open and close rapidly.',
      ),
    },
    {
      id: 'bpp-card-cavities',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Nenne die drei Räume des Vokaltrakts.', 'Name the three cavities of the vocal tract.'),
      back: l(
        'Rachenhöhle (Pharynx), Nasenhöhle und Mundhöhle.',
        'Pharyngeal cavity (pharynx), nasal cavity and oral cavity.',
      ),
    },
    {
      id: 'bpp-card-velum',
      kind: 'flashcard',
      difficulty: 2,
      prompt: l('Welche Aufgabe hat das Velum?', 'What does the velum do?'),
      back: l(
        'Es öffnet und schließt den Zugang zur Nasenhöhle: gehoben = oral, gesenkt = nasal.',
        'It opens and closes the entrance to the nasal cavity: raised = oral, lowered = nasal.',
      ),
    },
  ],
};
