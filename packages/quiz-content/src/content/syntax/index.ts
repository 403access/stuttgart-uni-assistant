import type { QuizModule } from '../../types.ts';

import { l } from '../helpers';
import { syntaxEinfuehrendes } from './einfuehrendes';
import { syntaxWortarten } from './wortarten';

export const syntaxModule: QuizModule = {
  id: 'syntax',
  code: 'Syntax 1',
  studyId: 'linguistik',
  semester: 2,
  title: l('Syntax I', 'Syntax I'),
  lecturer: 'Fabian Bross',
  email: 'fabian.bross@ling.uni-stuttgart.de',
  subtitle: l(
    'Einführende Sitzung vom 15. Oktober 2026 – was Syntax ist, wie Grammatiken bewertet werden und wie aus Wortarten Konstituenten und Phrasen werden.',
    'Introductory session on 15 October 2026 – what syntax is, how grammars are evaluated, and how word classes become constituents and phrases.',
  ),
  topics: [syntaxEinfuehrendes, syntaxWortarten],
};
