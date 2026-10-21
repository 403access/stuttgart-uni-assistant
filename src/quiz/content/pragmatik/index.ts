import type { QuizModule } from '@/src/quiz/types';

import { l } from '../helpers';
import { pragGrundlagen } from './grundlagen';
import { pragGrice } from './grice';
import { pragOrganisation } from './organisation';
import { pragSprechakte } from './sprechakte';

export const pragmatikModule: QuizModule = {
  id: 'prag',
  studyId: 'linguistik',
  semester: 3,
  title: l('Pragmatik I', 'Pragmatics I'),
  lecturer: 'Fabian Dirscherl',
  email: 'fabian.dirscherl@ling.uni-stuttgart.de',
  subtitle: l(
    'Was ist Pragmatik? – erste Sitzung am 12. Oktober 2026. Kontext und Äußerungsbedeutung, Grices Maximen und Implikaturen, Sprechakte sowie Organisatorisches zum Seminar.',
    'What is pragmatics? – first session on 12 October 2026. Context and utterance meaning, Grice’s maxims and implicatures, speech acts, and organisational matters.',
  ),
  topics: [pragGrundlagen, pragGrice, pragSprechakte, pragOrganisation],
};
