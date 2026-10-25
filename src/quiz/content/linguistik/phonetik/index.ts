import type { QuizModule } from '@/src/quiz/types';

import { l } from '../../helpers';
import { bppGrundlagen } from './grundlagen';
import { bppIpa } from './ipa';
import { bppVocalTract } from './vocal-tract';

/**
 * Basic Phonetics and Phonology (BPP), session 1. The module bundles the
 * articulatory head diagram, the phonetics/phonology basics and the IPA topic.
 */
export const phonetikModule: QuizModule = {
  id: 'bpp',
  studyId: 'linguistik',
  semester: 1,
  title: l('Basic Phonetics and Phonology', 'Basic Phonetics and Phonology'),
  subtitle: l(
    'Artikulatorische Phonetik, Phonologie und IPA – die Grundlagen der ersten Sitzung, mit beschriftetem Kopf-Querschnitt und Vokalviereck.',
    'Articulatory phonetics, phonology and the IPA – the basics of the first session, with a labelled head cross-section and vowel chart.',
  ),
  lecturer: 'Dr. Yulia Zuban',
  email: 'yulia.zuban@ling.uni-stuttgart.de',
  topics: [bppVocalTract, bppGrundlagen, bppIpa],
};
