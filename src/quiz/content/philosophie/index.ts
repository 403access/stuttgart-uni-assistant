import type { QuizModule } from '@/src/quiz/types';

import { l } from '../helpers';
import { philBegriffSprache } from './begriff-sprache';
import { philGeschichte } from './geschichte';
import { philWahrheit } from './wahrheit-aussagesatz';

export const philosophieModule: QuizModule = {
  id: 'phil',
  studyId: 'philosophie',
  title: l(
    'Einführung in die Geschichte der Philosophie',
    'Introduction to the History of Philosophy',
  ),
  lecturer: 'Prof. Dr. Christian Martin',
  email: 'christian.martin@philo.uni-stuttgart.de',
  subtitle: l(
    'Die Geschichtlichkeit der Philosophie – erste Vorlesung vom 19. Oktober 2026. Wahrheit, Aussagesatz, reine Begriffe und die Sprachlichkeit der Philosophie.',
    'The historicity of philosophy – first lecture on 19 October 2026. Truth, declarative sentences, pure concepts, and the linguisticity of philosophy.',
  ),
  topics: [philGeschichte, philWahrheit, philBegriffSprache],
};
