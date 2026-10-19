/* University Assistant — static site behaviour: language toggle, scroll reveal, lightbox. */
(() => {
  'use strict';

  /* ---------- language ---------- */

  // German is the authored markup; capture it once so the toggle can restore it.
  const de = {};
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    de[el.dataset.i18n] = el.textContent.trim();
  });
  const alts = {};
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    alts[el.dataset.i18nAlt] = el.alt;
  });
  const deTitle = document.title;
  const metaDescription = document.querySelector('meta[name="description"]');
  const deDescription = metaDescription ? metaDescription.getAttribute('content') : '';

  const en = {
    navFeatures: 'Features',
    navAssistant: 'Assistant',
    navGallery: 'Screens',
    navPrivacy: 'Privacy',
    navDocs: 'Docs',

    heroKicker: 'A student project',
    heroTitle: 'Your studies, in one place.',
    heroLead:
      'University Assistant brings the timetable, module progress, deadlines, ILIAS material, the campus map and UniMail into one app — and answers questions about them in German or English.',
    heroCtaPrimary: 'See the screens',
    heroCtaSecondary: 'View on GitHub',
    heroMetaPlatforms: 'iOS · Android · Web',
    heroMetaLocal: 'Answers on the device',
    heroMetaOpen: 'Open source · AGPL-3.0',

    stripSchedule: 'Timetable',
    stripModules: 'Modules & grades',
    stripDeadlines: 'Deadlines',
    stripAssistant: 'AI assistant',
    stripMail: 'UniMail',
    stripCampus: 'Campus map',

    featuresKicker: 'Features',
    featuresTitle: 'Everything the daily routine needs',
    featuresLead:
      'One record, many views: the demonstration set shows how timetable, examination rules, material and campus services fit together in one app.',

    f1Title: 'Timetable',
    f1Body: 'Lectures, tutorials, rooms and times from your own plan — today first.',
    f2Title: 'Modules & grades',
    f2Body: 'Earned ECTS per area, weighted average and the route to graduation.',
    f3Title: 'Deadlines',
    f3Body: 'Submission, registration and re-registration — gathered from C@MPUS, ILIAS and SDG Campus.',
    f4Title: 'Assistant',
    f4Body: 'Ask about deadlines, credits, modules or rooms — answered from your own record.',
    f5Title: 'UniMail',
    f5Body: 'Read, sort and search your mailbox without leaving the app.',
    f6Title: 'Campus map',
    f6Body: 'Buildings, rooms and contact points on the university map.',
    f7Title: 'Notes & past exams',
    f7Body: 'Peer ratings, shared notes and topics from earlier exams.',
    f8Title: 'Campus services',
    f8Body: 'PaperCut printing and network access, explained step by step.',

    aKicker: 'Assistant',
    aTitle: 'The assistant knows where you stand',
    aLead: 'Answers are built on the device first — instantly and without a network. Every answer names its sources.',
    a1: 'Local record, instant answer, no server needed.',
    a2: 'Sources under every answer: C@MPUS, ILIAS, SDG Campus.',
    a3: 'Optionally, Grok rewrites the answer when a key is configured.',
    a4: 'Ask in German or English.',

    pKicker: 'Progress',
    pTitle: 'Credits, grades and the examination rules in view',
    pLead:
      'The simplified demonstration plan shows what a study record looks like in the app — clearly marked as an assumption, never as official information.',
    p1: 'Earned ECTS per area, weighted average, open points.',
    p2: 'Prerequisites checked, next subjects suggested.',
    p3: 'Modules, structure, tutorials and lecturers in one view.',
    p4: 'Past-exam topics and peer notes complete the picture.',

    cKicker: 'Campus & services',
    cTitle: 'From the lecture hall to the printer',
    cLead: 'Orientation on campus and the services that are otherwise spread across three portals.',
    c1: 'Campus map with buildings, rooms and contact points.',
    c2: 'PaperCut printing, credit and locations, explained step by step.',
    c3: 'UniMail, platforms and calendar export in one place.',
    c4: 'Share your notes or keep them to yourself.',

    gKicker: 'Screens',
    gTitle: 'Pictures from the app',
    gLead:
      'Captured from the demonstration profile of Lena Hartmann. The grades, deadlines and courses are made up. Tap an image to enlarge it.',

    capDashboard: 'Home',
    capChat: 'Assistant',
    capCredits: 'Examination rules',
    capModules: 'Modules',
    capDeadlines: 'Deadlines',
    capDocuments: 'Documents',
    capNotes: 'Community',
    capMap: 'Campus',
    capPrinting: 'Printing',
    capLogin: 'Sign-in',

    tKicker: 'Privacy',
    tTitle: 'The device first, the network second',
    tLead:
      'The app works locally. The network and keys only come in where they are needed — and stay under the server’s control.',
    t1Title: 'Everything starts locally',
    t1Body: 'Timetable, grades, notes and the chat live on the device. The app runs without a server.',
    t2Title: 'Passwords stay with the university',
    t2Body: 'During the C@MPUS sign-in you type the password only on the university’s page. The app does not store it.',
    t3Title: 'The server holds the keys',
    t3Body: 'The xAI key and the C@MPUS credentials stay in the server process. The app sends only the question and context.',
    tNote:
      'University Assistant is a student demonstration project. It is not a service of the University of Stuttgart, it does not use the official logo, and Lena Hartmann’s grades are made up.',

    ctaKicker: 'Open source',
    ctaTitle: 'Open, traceable, runnable',
    ctaLead:
      'The code is on GitHub under AGPL-3.0-or-later. Build it, test it, change it — the checks run with a single command.',
    ctaGithub: 'Go to the repository',
    ctaDocs: 'Documentation',

    footerDocs: 'Documentation',
    footerLicense: 'Licence',
    footerShots: 'Screens',
    footerLine1:
      '© 2026 Oliver Molnar. University Assistant is a student demonstration project and not a service of the University of Stuttgart.',
    footerLine2:
      'Structured data, grades and deadlines (Lena Hartmann) are fictional. The colours follow the university’s published corporate colours; the mark is an original pairing of two circles, not the signet.',
    footerLine3:
      'Licence: GNU Affero General Public License, version 3 or later. Parts of the code were written with AI support; the assistant optionally uses xAI Grok.',
  };

  const enAlts = {
    altDashboard: 'Home screen with earned ECTS, today’s timetable and the next deadlines',
    altChat: 'The assistant answering a question about deadlines, with sources',
    altCredits: 'Examination-rules view with ECTS per area',
    altModules: 'Module plan with passed and open modules',
    altDeadlines: 'List of upcoming deadlines',
    altDocuments: 'Document hub with ILIAS material and notes',
    altNotes: 'Peer ratings and notes',
    altMap: 'University map with marked buildings',
    altPrinting: 'Printing instructions with a PaperCut link',
    altLogin: 'Sign-in screen with the university’s C@MPUS login',
  };

  const enTitle = 'University Assistant — your studies, in one place';
  const enDescription =
    'University Assistant brings the timetable, module progress, deadlines, ILIAS material, the campus map and UniMail into one app and answers questions about them. A student demonstration project for the University of Stuttgart.';

  function applyLanguage(lang) {
    const dict = lang === 'en' ? en : de;
    elements.forEach((el) => {
      const key = el.dataset.i18n;
      const value = lang === 'en' ? dict[key] : de[key];
      if (value) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const key = el.dataset.i18nAlt;
      el.alt = lang === 'en' ? (enAlts[key] ?? alts[key]) : alts[key];
    });
    document.title = lang === 'en' ? enTitle : deTitle;
    if (metaDescription) metaDescription.setAttribute('content', lang === 'en' ? enDescription : deDescription);
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });
    try {
      localStorage.setItem('ua-site-lang', lang);
    } catch {
      /* private mode */
    }
  }

  document.querySelectorAll('.lang button').forEach((button) => {
    button.addEventListener('click', () => applyLanguage(button.dataset.lang));
  });

  let stored = null;
  try {
    stored = localStorage.getItem('ua-site-lang');
  } catch {
    /* private mode */
  }
  const browserPrefersEnglish = (navigator.language || '').toLowerCase().startsWith('en');
  const preferred = stored === 'en' || stored === 'de' ? stored : browserPrefersEnglish ? 'en' : 'de';
  if (preferred === 'en') applyLanguage('en');

  /* ---------- scroll reveal ---------- */

  const revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    revealed.forEach((el) => observer.observe(el));
  } else {
    revealed.forEach((el) => el.classList.add('in'));
  }

  /* ---------- lightbox ---------- */

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = lightbox ? lightbox.querySelector('img') : null;
  let lastFocus = null;

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('show');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll('.gallery button[data-full]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!lightbox || !lightboxImage) return;
      lastFocus = button;
      lightboxImage.src = button.dataset.full;
      const source = button.querySelector('img');
      lightboxImage.alt = source ? source.alt : '';
      lightbox.classList.add('show');
      document.body.style.overflow = 'hidden';
      const close = document.getElementById('lightbox-close');
      if (close) close.focus();
    });
  });

  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    const close = document.getElementById('lightbox-close');
    if (close) close.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeLightbox();
    });
  }
})();
