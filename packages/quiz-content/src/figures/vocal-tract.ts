import { l } from '../content/helpers';
import type { DiagramRegion, QuizFigure } from '../types.ts';

/**
 * Sagittal section of the human head. The geometry is shared by the labelled
 * reference card on the topic screen and every diagram question, so a label and
 * its tap target can never drift apart.
 *
 * Coordinates are authored in a 0–1000 square and cropped to the head for
 * display.
 */
export const HEAD_VIEW_BOX = '160 40 760 950';

const SKULL = `M600 68 C460 58 356 148 316 268 C304 310 306 342 292 374
  C280 408 246 436 214 464 C196 480 176 492 186 504
  C194 514 210 514 222 514 C232 520 238 530 236 538
  C238 546 238 556 234 562 C230 574 236 592 246 608
  C252 618 254 630 258 640 C300 682 360 706 420 726
  C480 746 540 752 586 744 C576 772 556 800 544 838
  C532 878 526 936 526 986 L806 986 C806 900 812 820 842 748
  C876 666 900 588 900 486 C900 300 792 140 600 68 Z`;

/** Small helper for the rounded lip pads. */
function roundRect(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M${x + r} ${y}`,
    `H${x + width - r}`,
    `A${r} ${r} 0 0 1 ${x + width} ${y + r}`,
    `V${y + height - r}`,
    `A${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H${x + r}`,
    `A${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    `V${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

export const vocalTractRegions: DiagramRegion[] = [
  {
    id: 'nasal-cavity',
    number: 1,
    label: l('Nasenhöhle', 'Nasal cavity'),
    tone: 'blue',
    labelX: 480,
    labelY: 325,
    hitRadius: 40,
    path: `M238 500 C258 438 302 362 362 320 C422 280 502 274 562 298
      C614 318 644 354 656 394 C642 418 620 426 600 420
      C556 398 512 392 472 394 C412 396 354 410 306 432
      C282 444 262 468 250 490 Z`,
  },
  {
    id: 'pharynx',
    number: 10,
    label: l('Rachen (Pharynx)', 'Pharynx (throat)'),
    tone: 'violet',
    labelX: 660,
    labelY: 560,
    hitRadius: 40,
    path: `M600 418 C636 430 662 464 672 516 L692 694 L612 694
      C604 614 594 530 592 472 Z`,
  },
  {
    id: 'oral-cavity',
    number: 7,
    label: l('Mundhöhle', 'Oral cavity'),
    tone: 'rose',
    labelX: 330,
    labelY: 620,
    hitRadius: 42,
    path: `M250 548 C292 518 362 490 432 474 C502 458 562 462 606 484
      C632 500 646 540 642 580 C630 618 592 640 540 648
      C472 658 384 642 322 612 C282 592 252 572 250 548 Z`,
  },
  {
    id: 'tongue',
    number: 6,
    label: l('Zunge', 'Tongue'),
    tone: 'tongue',
    labelX: 460,
    labelY: 575,
    hitRadius: 48,
    path: `M300 570 C332 532 392 512 456 516 C520 520 580 548 616 592
      C636 618 648 652 650 684 C620 692 588 680 562 658
      C524 624 474 598 414 578 C360 562 326 566 300 570 Z`,
  },
  {
    id: 'hard-palate',
    number: 2,
    label: l('Gaumen (hart)', 'Hard palate'),
    tone: 'sand',
    labelX: 400,
    labelY: 420,
    hitRadius: 34,
    path: `M300 436 C352 408 420 394 486 398 L500 424
      C434 418 366 430 312 458 Z`,
  },
  {
    id: 'alveolar-ridge',
    number: 3,
    label: l('Zahndamm (Alveolar Ridge)', 'Alveolar ridge'),
    tone: 'bone',
    labelX: 320,
    labelY: 455,
    hitRadius: 28,
    path: `M288 446 C298 430 322 426 334 438 C344 450 338 468 320 472
      C302 476 286 462 288 446 Z`,
  },
  {
    id: 'teeth',
    number: 4,
    label: l('Zähne', 'Teeth'),
    tone: 'teeth',
    labelX: 293,
    labelY: 505,
    hitRadius: 30,
    path: `M264 466 C282 464 300 466 310 472 L312 536 C298 542 282 540 268 534 Z
      M272 570 C288 568 304 570 312 576 L314 610 C300 616 286 614 272 608 Z`,
  },
  {
    id: 'lips',
    number: 5,
    label: l('Lippen', 'Lips'),
    tone: 'lip',
    labelX: 222,
    labelY: 552,
    hitRadius: 30,
    path: `${roundRect(240, 514, 28, 34, 12)} ${roundRect(238, 556, 28, 32, 12)}`,
  },
  {
    id: 'velum',
    number: 8,
    label: l('Velum (weicher Gaumen)', 'Velum (soft palate)'),
    tone: 'violet',
    labelX: 545,
    labelY: 432,
    hitRadius: 30,
    path: `M492 402 C530 406 562 422 590 448 C606 464 604 482 590 484
      C570 486 556 468 540 452 C522 434 504 420 488 414 Z`,
  },
  {
    id: 'uvula',
    number: 9,
    label: l('Zäpfchen (Uvula)', 'Uvula'),
    tone: 'violet',
    labelX: 600,
    labelY: 497,
    hitRadius: 26,
    path: `M586 468 C596 482 598 500 590 512 C582 502 578 484 580 472 Z`,
  },
  {
    id: 'lower-jaw',
    number: 14,
    label: l('Unterkiefer', 'Lower jaw'),
    tone: 'sand',
    labelX: 430,
    labelY: 705,
    hitRadius: 40,
    path: `M258 606 C330 650 430 690 530 718 L590 730 L596 748
      C520 750 420 718 350 686 C300 662 264 636 248 616 Z`,
  },
  {
    id: 'larynx',
    number: 11,
    label: l('Kehlkopf (Larynx)', 'Larynx'),
    tone: 'larynx',
    labelX: 660,
    labelY: 715,
    hitRadius: 32,
    path: `M612 694 C646 688 680 692 704 708 L710 792 C682 808 644 812 614 802 Z`,
  },
  {
    id: 'vocal-cords',
    number: 12,
    label: l('Stimmlippen', 'Vocal cords'),
    tone: 'cords',
    labelX: 700,
    labelY: 760,
    hitRadius: 26,
    path: 'M626 744 L678 754 L678 764 L626 754 Z',
  },
  {
    id: 'trachea',
    number: 13,
    label: l('Luftröhre (Trachea)', 'Trachea (windpipe)'),
    tone: 'trachea',
    labelX: 670,
    labelY: 890,
    hitRadius: 44,
    path: 'M622 806 L704 806 L718 976 L628 976 Z',
  },
];

export const vocalTractFigure: QuizFigure = {
  title: l('Der Kopf im Querschnitt', 'The head in cross-section'),
  caption: l(
    'Sagittalschnitt durch Kopf und Hals. Die Nummern entsprechen den Artikulatoren und Räumen im Quiz.',
    'Sagittal section through head and neck. The numbers match the articulators and cavities used in the quiz.',
  ),
  viewBox: HEAD_VIEW_BOX,
  backdrop: [SKULL],
  regions: vocalTractRegions,
};

/** Vowel chart used in the IPA topic (front = left, back = right). */
export const VOWEL_VIEW_BOX = '0 0 800 520';
export const VOWEL_CHART = 'M140 80 L660 80 L740 440 L60 440 Z';

export const ipaVowelRegions: DiagramRegion[] = [
  {
    id: 'i-long',
    label: l('see', 'see'),
    glyph: 'iː',
    tone: 'blue',
    labelX: 200,
    labelY: 140,
    hitRadius: 34,
    circle: { cx: 200, cy: 140, r: 34 },
  },
  {
    id: 'i-short',
    label: l('sit', 'sit'),
    glyph: 'ɪ',
    tone: 'blue',
    labelX: 285,
    labelY: 215,
    hitRadius: 34,
    circle: { cx: 285, cy: 215, r: 34 },
  },
  {
    id: 'e',
    label: l('set', 'set'),
    glyph: 'e',
    tone: 'blue',
    labelX: 250,
    labelY: 300,
    hitRadius: 34,
    circle: { cx: 250, cy: 300, r: 34 },
  },
  {
    id: 'ash',
    label: l('cat', 'cat'),
    glyph: 'æ',
    tone: 'blue',
    labelX: 190,
    labelY: 390,
    hitRadius: 34,
    circle: { cx: 190, cy: 390, r: 34 },
  },
  {
    id: 'schwa',
    label: l('about', 'about'),
    glyph: 'ə',
    tone: 'blue',
    labelX: 450,
    labelY: 290,
    hitRadius: 34,
    circle: { cx: 450, cy: 290, r: 34 },
  },
  {
    id: 'strut',
    label: l('cup', 'cup'),
    glyph: 'ʌ',
    tone: 'blue',
    labelX: 470,
    labelY: 380,
    hitRadius: 34,
    circle: { cx: 470, cy: 380, r: 34 },
  },
  {
    id: 'nurse',
    label: l('sir', 'sir'),
    glyph: 'ɜː',
    tone: 'blue',
    labelX: 460,
    labelY: 220,
    hitRadius: 34,
    circle: { cx: 460, cy: 220, r: 34 },
  },
  {
    id: 'saw',
    label: l('saw', 'saw'),
    glyph: 'ɔː',
    tone: 'blue',
    labelX: 550,
    labelY: 320,
    hitRadius: 34,
    circle: { cx: 550, cy: 320, r: 34 },
  },
  {
    id: 'foot',
    label: l('book', 'book'),
    glyph: 'ʊ',
    tone: 'blue',
    labelX: 600,
    labelY: 220,
    hitRadius: 34,
    circle: { cx: 600, cy: 220, r: 34 },
  },
  {
    id: 'u-long',
    label: l('soon', 'soon'),
    glyph: 'uː',
    tone: 'blue',
    labelX: 665,
    labelY: 145,
    hitRadius: 34,
    circle: { cx: 665, cy: 145, r: 34 },
  },
  {
    id: 'car',
    label: l('car', 'car'),
    glyph: 'ɑː',
    tone: 'blue',
    labelX: 610,
    labelY: 405,
    hitRadius: 34,
    circle: { cx: 610, cy: 405, r: 34 },
  },
];

export const ipaVowelFigure: QuizFigure = {
  title: l('Das Vokalviereck', 'The vowel chart'),
  caption: l(
    'Links ist vorne, rechts hinten; oben liegt die Zunge hoch, unten tief. Die Symbole stehen für die Vokale in den Beispielwörtern.',
    'Front is on the left, back on the right; the tongue is high at the top and low at the bottom. The symbols stand for the vowels in the example words.',
  ),
  viewBox: VOWEL_VIEW_BOX,
  backdrop: [VOWEL_CHART],
  regions: ipaVowelRegions,
};
