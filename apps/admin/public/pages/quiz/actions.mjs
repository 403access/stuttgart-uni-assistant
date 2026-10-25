/**
 * Mutations shared by the catalog and topic views: re-import the bundled
 * catalog, delete a topic, publish/withdraw a topic, and delete a question.
 */

import { api, errorText } from '../../assets/api.mjs';
import { refresh } from '../../assets/runtime.mjs';
import { confirmAction, toast } from '../../assets/ui.mjs';

export async function reseedCatalog() {
  const ok = await confirmAction({
    title: 'Katalog neu importieren?',
    message: 'Der gebündelte Katalog ersetzt alle Themen und Fragen. Antworten und Runden bleiben erhalten. Eigene Änderungen am Katalog gehen verloren.',
    confirmLabel: 'Neu importieren',
    requireText: 'IMPORTIEREN',
  });
  if (!ok) return;
  try {
    const result = await api('/v1/admin/quiz/seed', { method: 'POST', body: {} });
    toast(`Katalog importiert: ${result.topics} Themen, ${result.questions} Fragen.`, 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

export async function removeTopic(topic) {
  const ok = await confirmAction({
    title: 'Thema löschen?',
    message: `„${topic.title.de}“ und alle seine Fragen werden gelöscht. Antworten bleiben als Verlauf erhalten.`,
    confirmLabel: 'Löschen',
    requireText: 'LÖSCHEN',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/quiz/topics/' + encodeURIComponent(topic.id), { method: 'DELETE' });
    toast('Thema gelöscht.', 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

export async function toggleTopic(topic) {
  try {
    await api('/v1/admin/quiz/topics/' + encodeURIComponent(topic.id), {
      method: 'POST',
      body: { published: !topic.published },
    });
    toast(topic.published ? 'Thema zurückgezogen.' : 'Thema veröffentlicht.', 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

export async function removeQuestion(topicId, question) {
  const ok = await confirmAction({
    title: 'Frage löschen?',
    message: 'Die Frage wird aus dem Katalog entfernt. Bereits abgegebene Antworten bleiben im Verlauf erhalten.',
    confirmLabel: 'Löschen',
    requireText: 'LÖSCHEN',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/quiz/questions/' + encodeURIComponent(question.id), { method: 'DELETE' });
    toast('Frage gelöscht.', 'ok');
    await refresh.current();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}
