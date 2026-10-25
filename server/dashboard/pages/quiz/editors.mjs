/**
 * Modal editors for topics, modules, and questions. Question-specific fields
 * are edited as JSON and validated again by the server.
 */

import { api, errorText } from '../../assets/api.mjs';
import { h } from '../../assets/dom.mjs';
import { icon } from '../../assets/icons.mjs';
import { refresh } from '../../assets/runtime.mjs';
import { toast } from '../../assets/ui.mjs';
import { KIND_LABELS, KIND_TEMPLATES, PAYLOAD_HINTS, closeDialog, dialogShell, field, moduleOptions } from './shared.mjs';

export function openTopicEditor(topic, modules) {
  const { dialog, form, error } = dialogShell(
    topic ? 'Thema bearbeiten' : 'Thema anlegen',
    topic ? 'Änderungen sind nach dem Speichern im App-Katalog sichtbar.' : 'Ein neues Thema wird erst mit veröffentlichten Fragen im App-Katalog sichtbar.',
  );
  const moduleSelect = h('select', null, ...moduleOptions(modules, topic?.moduleId));
  const titleDe = h('input', { type: 'text', required: true, value: topic?.title?.de ?? '', maxlength: '200', autocomplete: 'off' });
  const titleEn = h('input', { type: 'text', value: topic?.title?.en ?? '', maxlength: '200', autocomplete: 'off' });
  const summaryDe = h('textarea', { rows: '2', required: true, maxlength: '2000', value: topic?.summary?.de ?? '' });
  const summaryEn = h('textarea', { rows: '2', maxlength: '2000', value: topic?.summary?.en ?? '' });
  const meetingDe = h('input', { type: 'text', value: topic?.meeting?.de ?? '', maxlength: '200', autocomplete: 'off', placeholder: 'z. B. Sitzung 1 · 15.10.2026' });
  const meetingEn = h('input', { type: 'text', value: topic?.meeting?.en ?? '', maxlength: '200', autocomplete: 'off' });
  const sourceDe = h('input', { type: 'text', value: topic?.source?.de ?? '', maxlength: '300', autocomplete: 'off' });
  const sourceEn = h('input', { type: 'text', value: topic?.source?.en ?? '', maxlength: '300', autocomplete: 'off' });
  const figure = h('textarea', { rows: '6', className: 'mono', placeholder: 'optional – JSON mit viewBox und regions', value: topic?.figureJson ?? '' });
  const sortOrder = h('input', { type: 'number', value: topic?.sortOrder ?? '', placeholder: 'automatisch' });
  const published = h('input', { type: 'checkbox', class: 'checkbox' });
  published.checked = topic ? topic.published : true;
  const submit = h('button', { className: 'btn', type: 'submit' }, topic ? 'Speichern' : 'Thema anlegen');
  const cancel = h('button', { className: 'btn secondary', type: 'button', onClick: () => closeDialog(dialog) }, 'Abbrechen');

  form.append(h('div', { className: 'form-grid' },
    field('Modul', moduleSelect),
    field('Titel (Deutsch)', titleDe),
    field('Titel (Englisch)', titleEn, 'full'),
    field('Kurzbeschreibung (Deutsch)', summaryDe, 'full'),
    field('Kurzbeschreibung (Englisch)', summaryEn, 'full'),
    field('Sitzung (Deutsch)', meetingDe),
    field('Sitzung (Englisch)', meetingEn),
    field('Quelle (Deutsch)', sourceDe),
    field('Quelle (Englisch)', sourceEn),
    field('Reihenfolge', sortOrder),
    h('div', { className: 'field stack-field compact full' }, 'Schaubild (JSON, optional)', figure),
  ));
  form.append(
    h('p', { className: 'hint', text: 'Englische Felder sind optional und fallen auf Deutsch zurück. Das Schaubild nutzt dieselbe Struktur wie die mitgelieferten Diagramme.' }),
    h('label', { className: 'check-row' }, published, 'Im App-Katalog veröffentlichen'),
    error,
    h('div', { className: 'modal-actions' }, cancel, submit),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    let figureValue;
    const rawFigure = figure.value.trim();
    if (rawFigure) {
      try {
        figureValue = JSON.parse(rawFigure);
      } catch (parseError) {
        error.textContent = 'Schaubild-JSON ungültig: ' + parseError.message;
        return;
      }
    }
    const body = {
      moduleId: moduleSelect.value,
      titleDe: titleDe.value,
      titleEn: titleEn.value,
      summaryDe: summaryDe.value,
      summaryEn: summaryEn.value,
      meetingDe: meetingDe.value,
      meetingEn: meetingEn.value,
      sourceDe: sourceDe.value,
      sourceEn: sourceEn.value,
      figure: rawFigure ? figureValue : null,
      sortOrder: sortOrder.value === '' ? undefined : Number(sortOrder.value),
      published: published.checked,
    };
    submit.disabled = true;
    try {
      await api(topic ? '/v1/admin/quiz/topics/' + encodeURIComponent(topic.id) : '/v1/admin/quiz/topics', {
        method: 'POST',
        body,
      });
      toast(topic ? 'Thema gespeichert.' : 'Thema angelegt.', 'ok');
      closeDialog(dialog);
      await refresh.current();
    } catch (saveError) {
      error.textContent = errorText(saveError);
    } finally {
      submit.disabled = false;
    }
  });

  dialog.showModal();
  setTimeout(() => titleDe.focus(), 40);
}

export async function openTopicById(topicId, modules) {
  try {
    const { topic } = await api('/v1/admin/quiz/topics/' + encodeURIComponent(topicId));
    openTopicEditor(topic, modules);
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

export function openModuleEditor(module) {
  const { dialog, form, error } = dialogShell('Modul bearbeiten', 'Die Moduldaten erscheinen im Quiz-Hub und auf der Modulseite.');
  const titleDe = h('input', { type: 'text', required: true, value: module.title.de, maxlength: '200', autocomplete: 'off' });
  const titleEn = h('input', { type: 'text', value: module.title.en, maxlength: '200', autocomplete: 'off' });
  const subtitleDe = h('textarea', { rows: '2', required: true, maxlength: '2000', value: module.subtitle?.de ?? '' });
  const subtitleEn = h('textarea', { rows: '2', maxlength: '2000', value: module.subtitle?.en ?? '' });
  const semester = h('input', { type: 'number', min: '1', max: '20', value: String(module.semester || 1) });
  const lecturer = h('input', { type: 'text', value: module.lecturer ?? '', maxlength: '200', autocomplete: 'off' });
  const email = h('input', { type: 'email', value: module.email ?? '', maxlength: '200', autocomplete: 'off' });
  const published = h('input', { type: 'checkbox', class: 'checkbox' });
  published.checked = module.published;
  const submit = h('button', { className: 'btn', type: 'submit' }, 'Speichern');
  const cancel = h('button', { className: 'btn secondary', type: 'button', onClick: () => closeDialog(dialog) }, 'Abbrechen');

  form.append(
    h('div', { className: 'form-grid' },
      field('Titel (Deutsch)', titleDe),
      field('Titel (Englisch)', titleEn),
      field('Untertitel (Deutsch)', subtitleDe, 'full'),
      field('Untertitel (Englisch)', subtitleEn, 'full'),
      field('Semester', semester),
      field('Dozent', lecturer),
      field('E-Mail', email),
    ),
    h('label', { className: 'check-row' }, published, 'Im App-Katalog veröffentlichen'),
    error,
    h('div', { className: 'modal-actions' }, cancel, submit),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    try {
      await api('/v1/admin/quiz/modules/' + encodeURIComponent(module.id), {
        method: 'POST',
        body: {
          titleDe: titleDe.value,
          titleEn: titleEn.value,
          subtitleDe: subtitleDe.value,
          subtitleEn: subtitleEn.value,
          semester: Number(semester.value) || 1,
          lecturer: lecturer.value,
          email: email.value,
          published: published.checked,
        },
      });
      toast('Modul gespeichert.', 'ok');
      closeDialog(dialog);
      await refresh.current();
    } catch (saveError) {
      error.textContent = errorText(saveError);
    } finally {
      submit.disabled = false;
    }
  });
  dialog.showModal();
}

export function openQuestionEditor(topicId, question) {
  const { dialog, form, error } = dialogShell(
    question ? 'Frage bearbeiten' : 'Frage anlegen',
    'Der JSON-Teil enthält die antwortspezifischen Felder. Eine Vorlage hilft beim Einstieg.',
  );
  const id = h('input', { type: 'text', value: question?.id ?? '', placeholder: 'optional, sonst automatisch', maxlength: '120', autocomplete: 'off' });
  if (question) id.readOnly = true;
  const kind = h('select', null, ...Object.entries(KIND_LABELS).map(([value, label]) =>
    h('option', { value, text: label, selected: question?.kind === value })));
  const difficulty = h('select', null,
    h('option', { value: '1', text: 'Leicht', selected: (question?.difficulty ?? 2) === 1 }),
    h('option', { value: '2', text: 'Mittel', selected: (question?.difficulty ?? 2) === 2 }),
    h('option', { value: '3', text: 'Schwer', selected: (question?.difficulty ?? 2) === 3 }),
  );
  const promptDe = h('textarea', { rows: '2', required: true, maxlength: '2000', value: question?.prompt?.de ?? '' });
  const promptEn = h('textarea', { rows: '2', maxlength: '2000', value: question?.prompt?.en ?? '' });
  const hintDe = h('input', { type: 'text', value: question?.hint?.de ?? '', maxlength: '2000', autocomplete: 'off' });
  const hintEn = h('input', { type: 'text', value: question?.hint?.en ?? '', maxlength: '2000', autocomplete: 'off' });
  const explanationDe = h('textarea', { rows: '2', maxlength: '4000', value: question?.explanation?.de ?? '' });
  const explanationEn = h('textarea', { rows: '2', maxlength: '4000', value: question?.explanation?.en ?? '' });
  const payload = h('textarea', { rows: '14', className: 'mono', spellcheck: 'false', value: question?.payloadJson ?? JSON.stringify(KIND_TEMPLATES[kind.value], null, 2) });
  const sortOrder = h('input', { type: 'number', value: question?.sortOrder ?? '', placeholder: 'automatisch' });
  const hint = h('p', { className: 'hint', text: PAYLOAD_HINTS[kind.value] });
  const template = h('button', { className: 'btn secondary small', type: 'button', onClick: () => {
    payload.value = JSON.stringify(KIND_TEMPLATES[kind.value], null, 2);
    hint.textContent = PAYLOAD_HINTS[kind.value];
  } }, icon('refresh'), 'Vorlage einsetzen');
  kind.addEventListener('change', () => {
    hint.textContent = PAYLOAD_HINTS[kind.value];
    if (!question) payload.value = JSON.stringify(KIND_TEMPLATES[kind.value], null, 2);
  });
  const published = h('input', { type: 'checkbox', class: 'checkbox' });
  published.checked = question ? question.published : true;
  const submit = h('button', { className: 'btn', type: 'submit' }, question ? 'Speichern' : 'Frage anlegen');
  const cancel = h('button', { className: 'btn secondary', type: 'button', onClick: () => closeDialog(dialog) }, 'Abbrechen');

  form.append(
    h('div', { className: 'form-grid' },
      field('ID', id),
      field('Typ', kind),
      field('Schwierigkeit', difficulty),
      field('Reihenfolge', sortOrder),
      h('div', { className: 'field stack-field compact' }, 'Status', h('label', { className: 'check-row' }, published, 'veröffentlicht')),
      field('Frage (Deutsch)', promptDe, 'full'),
      field('Frage (Englisch)', promptEn, 'full'),
      field('Tipp (Deutsch)', hintDe),
      field('Tipp (Englisch)', hintEn),
      field('Erklärung (Deutsch)', explanationDe, 'full'),
      field('Erklärung (Englisch)', explanationEn, 'full'),
      h('div', { className: 'field stack-field compact full' },
        h('div', { className: 'row tight' }, h('span', { text: 'Antwort-JSON' }), template),
        payload,
      ),
    ),
    hint,
    error,
    h('div', { className: 'modal-actions' }, cancel, submit),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    let parsed;
    try {
      parsed = JSON.parse(payload.value);
    } catch (parseError) {
      error.textContent = 'JSON ungültig: ' + parseError.message;
      return;
    }
    submit.disabled = true;
    try {
      const body = {
        topicId,
        id: id.value.trim() || undefined,
        kind: kind.value,
        difficulty: Number(difficulty.value) || 2,
        promptDe: promptDe.value,
        promptEn: promptEn.value,
        hintDe: hintDe.value,
        hintEn: hintEn.value,
        explanationDe: explanationDe.value,
        explanationEn: explanationEn.value,
        payload: parsed,
        sortOrder: sortOrder.value === '' ? undefined : Number(sortOrder.value),
        published: published.checked,
      };
      await api(question ? '/v1/admin/quiz/questions/' + encodeURIComponent(question.id) : '/v1/admin/quiz/questions', {
        method: 'POST',
        body,
      });
      toast(question ? 'Frage gespeichert.' : 'Frage angelegt.', 'ok');
      closeDialog(dialog);
      await refresh.current();
    } catch (saveError) {
      error.textContent = errorText(saveError);
    } finally {
      submit.disabled = false;
    }
  });
  dialog.showModal();
  setTimeout(() => promptDe.focus(), 40);
}

