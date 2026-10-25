/**
 * One quiz topic: metadata, question list, and its latest answers.
 */

import { api, errorText } from '../../assets/api.mjs';
import { setPage } from '../../assets/auth-ui.mjs';
import { $, h } from '../../assets/dom.mjs';
import { number } from '../../assets/format.mjs';
import { icon } from '../../assets/icons.mjs';
import { badge, emptyState, loading, sectionHead } from '../../assets/ui.mjs';
import { removeQuestion, removeTopic, toggleTopic } from './actions.mjs';
import { openQuestionEditor, openTopicEditor } from './editors.mjs';
import { KIND_LABELS, localized, todayLabel, truncate } from './shared.mjs';

export async function renderTopicPage(route) {
  setPage('Quiz-Thema', 'Fragen bearbeiten und Antworten prüfen');
  const view = $('view');
  view.replaceChildren(loading('Thema wird geladen …'));
  try {
    const [{ topic }, attempts, overview] = await Promise.all([
      api('/v1/admin/quiz/topics/' + encodeURIComponent(route.id)),
      api('/v1/admin/quiz/attempts?limit=10&topicId=' + encodeURIComponent(route.id)),
      api('/v1/admin/quiz/overview'),
    ]);
    renderTopicShell(topic, attempts, overview);
  } catch (error) {
    view.replaceChildren(emptyState('alert', 'Thema konnte nicht geladen werden', errorText(error)));
    throw error;
  }
}

function renderTopicShell(topic, attempts, overview) {
  const view = $('view');
  const questionRows = topic.questions.length
    ? topic.questions.map((question) => h('tr', null,
        h('td', null,
          h('strong', { text: truncate(localized(question.prompt), 120) }),
          h('div', { className: 'hint', text: question.id }),
        ),
        h('td', null, badge(KIND_LABELS[question.kind] || question.kind, 'blue')),
        h('td', null, String(question.difficulty)),
        h('td', null, number(question.attempts)),
        h('td', null, question.attempts ? badge(question.accuracy + '%', question.accuracy >= 70 ? 'ok' : 'warn') : '–'),
        h('td', null, question.published ? badge('veröffentlicht', 'ok') : badge('Entwurf', 'warn')),
        h('td', null, h('div', { className: 'row tight' },
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => openQuestionEditor(topic.id, question) }, icon('edit'), 'Bearbeiten'),
          h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => removeQuestion(topic.id, question) }, icon('trash'), 'Löschen'),
        )),
      ))
    : [h('tr', null, h('td', { colspan: '7' }, emptyState('help', 'Noch keine Fragen', 'Lege die erste Frage für dieses Thema an.')))];

  const attemptRows = attempts.items?.length
    ? attempts.items.map((attempt) => h('tr', null,
        h('td', { style: { whiteSpace: 'nowrap' } }, h('span', { className: 'tiny', text: todayLabel(attempt.answeredAt) })),
        h('td', null,
          h('strong', { text: attempt.name || attempt.account || 'Unbekannt' }),
          h('div', { className: 'hint', text: attempt.account || attempt.userId }),
        ),
        h('td', { style: { maxWidth: '340px', whiteSpace: 'pre-wrap' } }, truncate(attempt.prompt.de, 140)),
        h('td', { style: { maxWidth: '300px', whiteSpace: 'pre-wrap' } }, attempt.answerText || JSON.stringify(attempt.answer)),
        h('td', null, attempt.correct ? badge('richtig', 'ok') : badge('falsch', 'danger')),
      ))
    : [h('tr', null, h('td', { colspan: '5' }, emptyState('inbox', 'Noch keine Antworten', 'Sobald ein Nutzer dieses Thema übt, erscheinen die Antworten hier.')))];

  view.replaceChildren(h('div', { className: 'view-stack' },
    h('div', { className: 'row tight' },
      h('a', { className: 'btn secondary small', href: '#/quiz' }, icon('chevron-left'), 'Katalog'),
    ),
    h('section', { className: 'card' },
      h('div', { className: 'card-head' },
        h('div', null,
          h('div', { className: 'row tight' },
            h('h2', { text: topic.title.de, style: { margin: 0 } }),
            topic.published ? badge('veröffentlicht', 'ok') : badge('Entwurf', 'warn'),
          ),
          h('p', { className: 'hint', text: `${topic.moduleTitle.de} · ${topic.studyTitle.de} · ${topic.questions.length} Fragen` }),
        ),
        h('div', { className: 'row tight' },
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => toggleTopic(topic) }, icon(topic.published ? 'eye-off' : 'eye'), topic.published ? 'Zurückziehen' : 'Veröffentlichen'),
          h('button', { className: 'btn secondary small', type: 'button', onClick: () => openTopicEditor(topic, overview.modulesList || []) }, icon('edit'), 'Thema bearbeiten'),
          h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => removeTopic(topic) }, icon('trash'), 'Löschen'),
        ),
      ),
      h('div', { className: 'detail-grid' },
        h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Antworten' }), h('div', { className: 'v', text: number(topic.attempts) })),
        h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Trefferquote' }), h('div', { className: 'v', text: topic.accuracy + '%' })),
        h('div', { className: 'field-box' }, h('div', { className: 'k', text: 'Schaubild' }), h('div', { className: 'v', text: topic.figureJson ? 'vorhanden' : '–' })),
      ),
      h('p', { className: 'hint', text: localized(topic.summary) }),
    ),
    h('section', { className: 'card' },
      sectionHead('Fragen', `${topic.questions.length} Fragen in diesem Thema`, h('button', { className: 'btn', type: 'button', onClick: () => openQuestionEditor(topic.id, null) }, icon('plus'), 'Frage anlegen')),
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('thead', null, h('tr', null,
          h('th', null, 'Frage'),
          h('th', null, 'Typ'),
          h('th', null, 'Stufe'),
          h('th', null, 'Antworten'),
          h('th', null, 'Treffer'),
          h('th', null, 'Status'),
          h('th', null, ''),
        )),
        h('tbody', null, ...questionRows),
      )),
    ),
    h('section', { className: 'card' },
      sectionHead('Letzte Antworten', 'Die jüngsten geprüften Antworten zu diesem Thema.', h('a', { className: 'btn secondary small', href: '#/quiz/attempts?topicId=' + encodeURIComponent(topic.id) }, icon('list'), 'Alle Antworten')),
      h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
        h('thead', null, h('tr', null,
          h('th', null, 'Zeit'),
          h('th', null, 'Nutzer'),
          h('th', null, 'Frage'),
          h('th', null, 'Antwort'),
          h('th', null, 'Ergebnis'),
        )),
        h('tbody', null, ...attemptRows),
      )),
    ),
  ));
}
