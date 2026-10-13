import { buildLocalAnswer } from '../src/assistant/answer';
import { buildAnswerInput } from '../src/assistant/context';
import { modules, program } from '../src/data';
import { suggestNextSemester, totals, weightedAverage } from '../src/domain/plan';

const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
    console.error('FAIL', message);
  } else {
    console.log('ok', message);
  }
}

const now = new Date(2026, 9, 13, 8, 30, 0);
const credit = totals(modules);
const suggestion = suggestNextSemester(modules, program.areas);
const suggestionIds = suggestion.map((item) => item.id);
const suggestionEcts = suggestion.reduce((sum, item) => sum + item.ects, 0);

expect(credit.earned === 90, `earned ECTS is 90 (${credit.earned})`);
expect(credit.active === 18, `enrolled ECTS is 18 (${credit.active})`);
expect(credit.open === 72, `open ECTS is 72 (${credit.open})`);
expect(credit.total === 180, `module ECTS sum to 180 (${credit.total})`);
expect(weightedAverage(modules) === 1.9, `average is 1.9 (${weightedAverage(modules)})`);
expect(suggestionEcts === 30, `suggestion is 30 ECTS (${suggestionEcts}: ${suggestionIds.join(', ')})`);
expect(suggestionIds.includes('num'), 'suggestion closes mathematics with numerics');
expect(suggestionIds.includes('prakt'), 'suggestion includes the internship');
expect(!suggestionIds.includes('ml'), 'suggestion does not include locked machine learning');
expect(!suggestionIds.includes('thesis'), 'suggestion does not include the locked thesis');

function ask(question: string) {
  const input = buildAnswerInput({ locale: 'de', question, now });
  return buildLocalAnswer(input).text;
}

const credits = ask('Wie viele ECTS fehlen mir noch?');
expect(credits.includes('90') && credits.includes('180'), 'credit answer names 90 and 180');
expect(credits.includes('1,9'), 'credit answer names the 1,9 average');

const room = ask('Wo ist die Mensa in Vaihingen?');
expect(room.includes('Pfaffenwaldring 45'), 'mensa answer names Pfaffenwaldring 45');

const deadline = ask('Wann endet die Prüfungsanmeldung?');
expect(deadline.includes('16.11.2026'), 'registration answer names 16.11.2026');

const today = ask('Was habe ich heute?');
expect(today.includes('Künstlichen Intelligenz') && today.includes('V47.02'), 'Tuesday answer names the AI lecture in V47.02');

const machineLearning = ask('Kann ich Maschinelles Lernen jetzt belegen?');
expect(machineLearning.includes('M-INF-640'), 'machine learning answer names the module');
expect(/nicht bestanden|Noch nicht belegbar/i.test(machineLearning), 'machine learning answer says it is locked');

const slides = buildLocalAnswer(
  buildAnswerInput({
    locale: 'de',
    question: 'Fasse das zusammen',
    now,
    focus: {
      title: 'KI, Folien Woche 3 · Suche',
      text: 'A* sortiert die Randmenge nach f(n) = g(n) + h(n). Ist die Heuristik zulässig, überschätzt sie die Restkosten nicht.',
    },
  }),
).text;
expect(slides.includes('A*'), 'document summary keeps A*');

if (failures.length) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('assistant checks passed');
