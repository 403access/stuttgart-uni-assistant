#!/usr/bin/env node
/**
 * Creates the beta forms in Tally: the signup form, a German survey, an
 * English survey, and the separate interview signup.
 *
 *   node tools/create-beta-forms.mjs              create four drafts
 *   node tools/create-beta-forms.mjs --publish    publish the drafts
 *   node tools/create-beta-forms.mjs --force      create a new set
 *   node tools/create-beta-forms.mjs --signup     create or reuse the signup form only
 *   node tools/create-beta-forms.mjs --dry-run    print the block counts, no API call
 *
 * The key is read from TALLY_API_KEY, `~/.config/tally/api_key`, or the
 * git-ignored `.env`, in that order. It is never printed. The form ids are
 * written to `docs/product/beta-forms.json` so a second run publishes the
 * existing drafts instead of creating duplicates.
 *
 * The wording lives in `docs/product/beta-survey.md` and
 * `docs/product/beta-signup.md`. Keep them in step.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiBase = 'https://api.tally.so';
const envPath = new URL('../.env', import.meta.url);
const recordPath = new URL('../docs/product/beta-forms.json', import.meta.url);

const args = new Set(process.argv.slice(2));
const publish = args.has('--publish');
const force = args.has('--force');
const dryRun = args.has('--dry-run');
const signup = args.has('--signup');

/** Read one key from a dotenv-shaped file without evaluating it. */
function readEnvValue(text, key) {
  const line = text
    .split(/\r?\n/)
    .find((item) => new RegExp(`^\\s*${key}\\s*=`).test(item));
  return line ? line.slice(line.indexOf('=') + 1).replace(/^['"]|['"]$/g, '').trim() : '';
}

function readApiKey() {
  if (process.env.TALLY_API_KEY) return process.env.TALLY_API_KEY.trim();
  const userKey = join(homedir(), '.config/tally/api_key');
  if (existsSync(userKey)) return readFileSync(userKey, 'utf8').trim();
  if (existsSync(envPath)) return readEnvValue(readFileSync(envPath, 'utf8'), 'TALLY_API_KEY');
  return '';
}

const apiKey = dryRun ? '' : readApiKey();
if (!apiKey && !dryRun) {
  console.error(`No Tally API key found.

Set one of these, then run the script again:
  1. export TALLY_API_KEY=tly-...
  2. printf '%s' 'tly-...' > ~/.config/tally/api_key && chmod 600 ~/.config/tally/api_key
  3. add TALLY_API_KEY=... to the git-ignored .env

Create a key at https://developers.tally.so/api-reference/api-keys`);
  process.exit(1);
}

async function tally(path, body, method = 'GET') {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    const message = data?.message ?? data?.error ?? text.slice(0, 200);
    throw new Error(`Tally ${method} ${path} failed (${response.status}): ${message}`);
  }
  return data;
}

const uuid = () => randomUUID();

function formTitle(title, buttonLabel) {
  return {
    uuid: uuid(),
    type: 'FORM_TITLE',
    groupUuid: uuid(),
    groupType: 'FORM_TITLE',
    payload: { title, html: title, button: { label: buttonLabel } },
  };
}

function paragraph(html) {
  return { uuid: uuid(), type: 'TEXT', groupUuid: uuid(), groupType: 'TEXT', payload: { html } };
}

function heading(html) {
  return { uuid: uuid(), type: 'HEADING_2', groupUuid: uuid(), groupType: 'HEADING_2', payload: { html } };
}

function questionTitle(html) {
  return { uuid: uuid(), type: 'TITLE', groupUuid: uuid(), groupType: 'QUESTION', payload: { html } };
}

function textQuestion(html, { required = false, placeholder = '' } = {}) {
  return [
    questionTitle(html),
    {
      uuid: uuid(),
      type: 'INPUT_TEXT',
      groupUuid: uuid(),
      groupType: 'INPUT_TEXT',
      payload: { isRequired: required, placeholder },
    },
  ];
}

function emailQuestion(html, { required = false, placeholder = '' } = {}) {
  return [
    questionTitle(html),
    {
      uuid: uuid(),
      type: 'INPUT_EMAIL',
      groupUuid: uuid(),
      groupType: 'INPUT_EMAIL',
      payload: { isRequired: required, placeholder },
    },
  ];
}

function phoneQuestion(html, { required = false, placeholder = '' } = {}) {
  return [
    questionTitle(html),
    {
      uuid: uuid(),
      type: 'INPUT_PHONE_NUMBER',
      groupUuid: uuid(),
      groupType: 'INPUT_PHONE_NUMBER',
      payload: { isRequired: required, placeholder },
    },
  ];
}

function numberQuestion(html, { required = false, placeholder = '', min, max } = {}) {
  const payload = { isRequired: required, placeholder };
  if (min !== undefined) Object.assign(payload, { hasMinNumber: true, minNumber: min });
  if (max !== undefined) Object.assign(payload, { hasMaxNumber: true, maxNumber: max });
  return [
    questionTitle(html),
    { uuid: uuid(), type: 'INPUT_NUMBER', groupUuid: uuid(), groupType: 'INPUT_NUMBER', payload },
  ];
}

function longTextQuestion(html, { required = false, placeholder = '' } = {}) {
  return [
    questionTitle(html),
    {
      uuid: uuid(),
      type: 'TEXTAREA',
      groupUuid: uuid(),
      groupType: 'TEXTAREA',
      payload: { isRequired: required, placeholder },
    },
  ];
}

function singleChoice(html, options, { required = false } = {}) {
  const group = uuid();
  const blocks = [questionTitle(html)];
  options.forEach((text, index) => {
    blocks.push({
      uuid: uuid(),
      type: 'MULTIPLE_CHOICE_OPTION',
      groupUuid: group,
      groupType: 'MULTIPLE_CHOICE',
      payload: {
        isRequired: required,
        index,
        isFirst: index === 0,
        isLast: index === options.length - 1,
        text,
      },
    });
  });
  return blocks;
}

function checkboxes(html, options) {
  const group = uuid();
  const blocks = [questionTitle(html)];
  options.forEach((text, index) => {
    blocks.push({
      uuid: uuid(),
      type: 'CHECKBOX',
      groupUuid: group,
      groupType: 'CHECKBOXES',
      payload: {
        index,
        isFirst: index === 0,
        isLast: index === options.length - 1,
        text,
      },
    });
  });
  return blocks;
}

const areas = {
  de: [
    'Heute',
    'Kalender',
    'Studium/Module',
    'Chat',
    'Dokumente',
    'Fristen',
    'Kommilitonen',
    'Campus/Karte',
    'Kurse',
    'Mail',
    'VPN/Drucker',
    'Mehr/Schnittstelle',
  ],
  en: [
    'Today',
    'Calendar',
    'Studies/Modules',
    'Chat',
    'Documents',
    'Deadlines',
    'Peers',
    'Campus/Map',
    'Courses',
    'Mail',
    'VPN/Printing',
    'More/API',
  ],
};

function surveyBlocks(lang, interviewUrl) {
  const de = lang === 'de';
  const blocks = [];

  blocks.push(
    formTitle(
      de ? 'Uni-Assistant Beta – Fragebogen' : 'Uni-Assistant Beta — Questionnaire',
      de ? 'Absenden' : 'Submit'
    )
  );

  blocks.push(
    paragraph(
      de
        ? 'Das ist ein studentisches Projekt, kein Angebot der Universität Stuttgart. Deine Antworten entscheiden mit, was als Nächstes gebaut wird. Bitte gib keine Passwörter, Tokens oder Matrikelnummern ein. Die Auswertung erfolgt pseudonym.'
        : 'This is a student project, not an official University of Stuttgart service. Your answers help decide what gets built next. Please do not enter passwords, tokens, or matriculation numbers. Responses are evaluated pseudonymously.'
    )
  );

  blocks.push(
    ...singleChoice(
      de
        ? 'Ich habe den Hinweis gelesen und bin mit der pseudonymen Auswertung einverstanden.'
        : 'I have read the notice and agree to pseudonymous evaluation.',
      de ? ['Ja, ich stimme zu'] : ['Yes, I agree'],
      { required: true }
    )
  );

  blocks.push(heading(de ? 'A. Zu dir' : 'A. About you'));
  blocks.push(
    ...textQuestion(de ? 'Was studierst du?' : 'What do you study?', {
      placeholder: de ? 'z. B. Informatik B.Sc.' : 'e.g. Computer Science BSc',
    })
  );
  blocks.push(
    ...numberQuestion(de ? 'In welchem Fachsemester?' : 'In which semester?', {
      placeholder: de ? 'z. B. 5' : 'e.g. 5',
      min: 1,
      max: 30,
    })
  );
  blocks.push(
    ...singleChoice(
      de ? 'Wo hast du die App getestet?' : 'Where did you test the app?',
      de
        ? ['iOS (Dev-Build)', 'Android (Dev-Build)', 'Webbrowser', 'Expo Go', 'Sonstiges']
        : ['iOS (dev build)', 'Android (dev build)', 'Web browser', 'Expo Go', 'Other']
    )
  );
  blocks.push(
    ...singleChoice(
      de
        ? 'Hast du mit dem Demo-Profil oder mit deinem eigenen C@MPUS-Konto getestet?'
        : 'Did you test with the demo profile or your own C@MPUS account?',
      de
        ? ['Demo-Profil (Lena Hartmann)', 'Eigenes Konto', 'Beides']
        : ['Demo profile (Lena Hartmann)', 'Own account', 'Both']
    )
  );
  blocks.push(
    ...singleChoice(
      de ? 'An wie vielen Tagen hast du die App geöffnet?' : 'On how many days did you open the app?',
      de ? ['1', '2–3', '4–7', 'mehr als 7'] : ['1', '2–3', '4–7', 'more than 7']
    )
  );

  blocks.push(heading(de ? 'B. Erster Start und Anmeldung' : 'B. First run and sign-in'));
  blocks.push(
    ...singleChoice(
      de ? 'Welchen Anmeldeweg hast du benutzt?' : 'Which sign-in path did you use?',
      de
        ? [
            'Im C@MPUS-Browser anmelden (Beta)',
            'Automatisch anmelden',
            'Mit C@MPUS-Token anmelden',
            'Mit SIAM anmelden',
            'Mit dieser Nutzerkennung weiter',
            'Demonstrationsprofil öffnen',
            'Mehrere',
          ]
        : [
            'C@MPUS browser (Beta)',
            'Automatic sign-in',
            'C@MPUS token',
            'SIAM',
            'Username only',
            'Demo profile',
            'Several',
          ]
    )
  );
  blocks.push(
    ...singleChoice(
      de ? 'Hat die Anmeldung funktioniert?' : 'Did sign-in work?',
      de ? ['Ja', 'Nein', 'Nicht ausprobiert'] : ['Yes', 'No', 'Did not try']
    )
  );
  blocks.push(
    ...longTextQuestion(
      de
        ? 'Falls nein: An welcher Stelle hat es aufgehört, und was hast du gesehen?'
        : 'If no: where did it stop, and what did you see?',
      { placeholder: de ? 'Ein oder zwei Sätze reichen.' : 'One or two sentences are enough.' }
    )
  );
  blocks.push(
    ...singleChoice(
      de
        ? 'Wie hast du dich gefühlt, als du deine C@MPUS-Zugangsdaten in der App eingegeben hast?'
        : 'How did you feel entering your C@MPUS credentials into the app?',
      de
        ? ['1 – sehr unwohl', '2', '3', '4', '5 – unproblematisch', 'Nicht ausprobiert']
        : ['1 – very uncomfortable', '2', '3', '4', '5 – fine', 'Did not try']
    )
  );
  blocks.push(
    ...singleChoice(
      de
        ? 'War dir klar, welche Daten echt sind und welche aus dem Demonstrationsprofil stammen?'
        : 'Was it clear which data was real and which came from the demonstration record?',
      de ? ['Ja', 'Teilweise', 'Nein'] : ['Yes', 'Partly', 'No']
    )
  );
  blocks.push(
    ...longTextQuestion(de ? 'Was war unklar?' : 'What was unclear?', {
      placeholder: de ? 'Optional' : 'Optional',
    })
  );

  blocks.push(heading(de ? 'C. Nutzung und Nutzen' : 'C. Use and value'));
  blocks.push(...checkboxes(de ? 'Welche Bereiche hast du geöffnet?' : 'Which areas did you open?', areas[lang]));
  blocks.push(
    ...singleChoice(
      de ? 'Welcher Bereich war am nützlichsten?' : 'Which area was most useful?',
      areas[lang]
    )
  );
  blocks.push(...textQuestion(de ? 'Warum?' : 'Why?', { placeholder: de ? 'Optional' : 'Optional' }));
  blocks.push(
    ...singleChoice(
      de ? 'Wie korrekt waren die Inhalte, die du geprüft hast?' : 'How accurate was the content you checked?',
      de
        ? ['1 – vieles falsch', '2', '3', '4', '5 – alles korrekt', 'Nicht geprüft']
        : ['1 – much of it wrong', '2', '3', '4', '5 – all correct', 'Did not check']
    )
  );
  blocks.push(
    ...longTextQuestion(de ? 'Was war falsch oder fehlt?' : 'What was wrong or missing?', {
      placeholder: de ? 'Optional' : 'Optional',
    })
  );
  blocks.push(
    ...longTextQuestion(de ? 'Was war der nervigste Moment?' : 'What was the most frustrating moment?', {
      required: true,
      placeholder: de ? 'Der wichtigste Punkt im Fragebogen.' : 'The most important question in the survey.',
    })
  );

  blocks.push(heading(de ? 'D. Weiterbenutzen und nächster Schritt' : 'D. Retention and next step'));
  blocks.push(
    ...singleChoice(
      de ? 'Würdest du die App im Semester wöchentlich benutzen?' : 'Would you use the app weekly during the semester?',
      de
        ? ['Auf jeden Fall', 'Wahrscheinlich', 'Unsicher', 'Wahrscheinlich nicht', 'Nein']
        : ['Definitely', 'Probably', 'Not sure', 'Probably not', 'No']
    )
  );
  blocks.push(
    ...longTextQuestion(de ? 'Warum?' : 'Why?', { placeholder: de ? 'Optional' : 'Optional' })
  );
  blocks.push(
    ...singleChoice(
      de
        ? 'Wie enttäuscht wärst du, wenn du die App ab morgen nicht mehr benutzen könntest?'
        : 'How disappointed would you be if you could no longer use the app from tomorrow?',
      de ? ['Sehr enttäuscht', 'Etwas enttäuscht', 'Nicht enttäuscht'] : ['Very disappointed', 'Somewhat disappointed', 'Not disappointed']
    )
  );
  blocks.push(
    ...longTextQuestion(de ? 'Sonst noch etwas?' : 'Anything else?', {
      placeholder: de ? 'Optional' : 'Optional',
    })
  );

  blocks.push(
    paragraph(
      de
        ? `Danke! Wenn du uns 15 Minuten zu deinen Erfahrungen geben magst, trag dich hier ein: <a href="${interviewUrl}">Interview-Termin</a>. Deine Kontaktdaten werden nicht mit diesem Fragebogen verknüpft.`
        : `Thank you! If you are open to 15 minutes of questions, sign up here: <a href="${interviewUrl}">interview signup</a>. Your contact details are not linked to this questionnaire.`
    )
  );

  return blocks;
}

function interviewBlocks() {
  return [
    formTitle('Uni-Assistant Beta – Interview (15 Minuten) / Interview (15 minutes)', 'Absenden / Submit'),
    paragraph(
      'Danke für dein Interesse. Trag hier deinen Kontakt ein, wenn wir dich für 15 Minuten zu deinen Erfahrungen befragen dürfen. Die Kontaktdaten werden getrennt von den Fragebogen-Antworten gespeichert und nach den Interviews gelöscht.<br><br>Thank you. Leave your contact details if we may ask you 15 minutes of questions. They are stored separately from the questionnaire answers and deleted after the interviews.'
    ),
    ...textQuestion('Name oder Pseudonym / Name or pseudonym', {
      placeholder: 'Optional',
    }),
    ...textQuestion('E-Mail oder Matrix-Handle / Email or Matrix handle', {
      required: true,
      placeholder: 'name@example.org',
    }),
    ...singleChoice('Sprache / Language', ['Deutsch', 'English']),
    ...longTextQuestion('Wann passt es dir? / When suits you?', {
      placeholder: 'Optional',
    }),
    ...singleChoice(
      'Ich bin mit der Kontaktaufnahme einverstanden und kann jederzeit absagen. / I agree to be contacted and can cancel at any time.',
      ['Ja / Yes'],
      { required: true }
    ),
    paragraph('Danke! / Thank you!'),
  ];
}

function signupBlocks() {
  return [
    formTitle('Uni-Assistant Beta – Anmeldung / Beta signup', 'Absenden / Submit'),
    paragraph(
      'Danke für dein Interesse an der Beta. Das ist ein studentisches Projekt, kein Angebot der Universität Stuttgart. Wir nutzen deine Angaben nur, um dich zur Beta zu kontaktieren.<br><br>Thanks for your interest in the beta. This is a student project, not an official University of Stuttgart service. We use your details only to contact you about the beta.'
    ),
    ...textQuestion('Name / Name', {
      required: true,
      placeholder: 'Vor- und Nachname / Full name',
    }),
    ...emailQuestion('E-Mail / Email', {
      required: true,
      placeholder: 'name@example.org',
    }),
    ...phoneQuestion('Telefon / Phone (optional)', {
      placeholder: '+49 …',
    }),
    ...singleChoice(
      'Auf welchem Gerät testest du? / Which device will you test on?',
      ['iOS', 'Android'],
      { required: true }
    ),
    ...longTextQuestion(
      'Was frustriert dich an den aktuellen Plattformen? / What frustrates you about the current platforms?',
      {
        required: true,
        placeholder: 'C@MPUS, ILIAS, Uni-Mail, …',
      }
    ),
    ...singleChoice(
      'Ich bin mit der Kontaktaufnahme zur Beta und der Speicherung meiner Angaben bis zum Ende der Beta einverstanden. / I agree to be contacted about the beta and to my details being stored until the end of the beta.',
      ['Ja, ich stimme zu / Yes, I agree'],
      { required: true }
    ),
    paragraph('Danke! Wir melden uns per E-Mail. / Thank you! We will get in touch by email.'),
  ];
}

function loadRecord() {
  if (!existsSync(recordPath)) return null;
  try {
    return JSON.parse(readFileSync(recordPath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${fileURLToPath(recordPath)}: ${error.message}`);
  }
}

async function createForm(name, blocks, settings, status) {
  const created = await tally(
    '/forms',
    {
      status: status ?? (publish ? 'PUBLISHED' : 'DRAFT'),
      blocks,
      settings,
    },
    'POST'
  );
  const full = await tally(`/forms/${created.id}`);
  console.log(`${name}: https://tally.so/r/${created.id} (${full.blocks?.length ?? '?'} blocks, ${created.status})`);
  return { id: created.id, name: created.name, url: `https://tally.so/r/${created.id}` };
}

async function main() {
  if (dryRun) {
    const interviewUrl = 'https://tally.so/r/INTERVIEW_ID';
    const de = surveyBlocks('de', interviewUrl);
    const en = surveyBlocks('en', interviewUrl);
    const interview = interviewBlocks();
    const signupForm = signupBlocks();
    console.log(`signup:     ${signupForm.length} blocks`);
    console.log(`de survey:  ${de.length} blocks`);
    console.log(`en survey:  ${en.length} blocks`);
    console.log(`interview:  ${interview.length} blocks`);
    console.log('Dry run only. Nothing was sent to Tally.');
    return;
  }

  const existing = loadRecord();

  if (signup) {
    if (existing?.forms?.signup && !force) {
      console.log(`signup already exists: ${existing.forms.signup.url}`);
      console.log('Use --force to create a new one.');
      return;
    }
    const created = await createForm(
      'signup',
      signupBlocks(),
      {
        language: 'de',
        hasProgressBar: false,
        hasPartialSubmissions: false,
        saveForLater: true,
      },
      'PUBLISHED'
    );
    const record = existing ?? { createdAt: new Date().toISOString(), forms: {} };
    record.forms = { ...record.forms, signup: created };
    record.status = 'PUBLISHED';
    record.publishedAt = new Date().toISOString();
    writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`\nWrote ${fileURLToPath(recordPath)}`);
    return;
  }

  if (existing && !force) {
    if (!publish) {
      console.log('A set already exists in docs/product/beta-forms.json:');
      for (const [key, form] of Object.entries(existing.forms)) console.log(`  ${key}: ${form.url}`);
      console.log('Use --publish to publish these drafts, or --force to create a new set.');
      return;
    }
    for (const [key, form] of Object.entries(existing.forms)) {
      // Send the full block set again. A status-only PATCH can leave the public
      // renderer on a stale draft state, which returns 500 for the form URL.
      const full = await tally(`/forms/${form.id}`);
      await tally(`/forms/${form.id}`, { status: 'PUBLISHED', blocks: full.blocks }, 'PATCH');
      console.log(`published ${key}: ${form.url}`);
    }
    writeFileSync(
      recordPath,
      `${JSON.stringify({ ...existing, status: 'PUBLISHED', publishedAt: new Date().toISOString() }, null, 2)}\n`
    );
    return;
  }

  console.log('Creating the signup form, then the interview form so the survey can link to it.');
  const signupForm = await createForm('signup', signupBlocks(), {
    language: 'de',
    hasProgressBar: false,
    hasPartialSubmissions: false,
    saveForLater: true,
  });

  const interview = await createForm('interview', interviewBlocks(), {
    language: 'de',
    hasProgressBar: false,
    hasPartialSubmissions: false,
    saveForLater: true,
  });

  const de = await createForm('de', surveyBlocks('de', interview.url), {
    language: 'de',
    hasProgressBar: true,
    hasPartialSubmissions: false,
    saveForLater: true,
  });
  const en = await createForm('en', surveyBlocks('en', interview.url), {
    language: 'en',
    hasProgressBar: true,
    hasPartialSubmissions: false,
    saveForLater: true,
  });

  const record = {
    createdAt: new Date().toISOString(),
    status: publish ? 'PUBLISHED' : 'DRAFT',
    forms: { signup: signupForm, de, en, interview },
  };
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

  console.log(`\nWrote ${fileURLToPath(recordPath)}`);
  if (!publish) console.log('Review the drafts, then run with --publish.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
