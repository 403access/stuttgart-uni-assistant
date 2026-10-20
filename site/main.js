/* University Assistant — static site behaviour: language toggle, mobile nav, scroll reveal, lightbox. */
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
  const deAria = {};
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    deAria[el.dataset.i18nAria] = el.getAttribute('aria-label') || '';
  });
  const deTitle = document.title;
  const metaDescription = document.querySelector('meta[name="description"]');
  const deDescription = metaDescription ? metaDescription.getAttribute('content') : '';

  const en = {
    skipLink: 'Skip to content',
    navFeatures: 'Features',
    navAssistant: 'Assistant',
    navGallery: 'Screens',
    navStatus: 'Status',
    navFaq: 'FAQ',

    docsKicker: 'For the curious',
    docsTitle: 'Documentation',
    docsLead:
      'Setup, architecture and operations: the technical documentation explains how the app is built and how to run it yourself.',
    docsCta: 'Open the documentation',

    heroKicker: 'A student project',
    heroTitle: 'Your studies, in one place.',
    heroLead:
      'University Assistant brings the timetable, module progress, deadlines, ILIAS material, the campus map and UniMail into one app — and answers questions about them in German or English.',
    heroCtaPrimary: 'Register for the beta',
    heroCtaSecondary: 'See the screens',
    heroMetaPlatforms: 'Beta: iOS & Android',
    heroMetaLocal: 'Answers start on the device',
    heroMetaOpen: 'Open source · AGPL-3.0',
    heroNote: 'Not official: a student project, not a service of the University of Stuttgart.',

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
    f3Body:
      'Deadlines in the demonstration record. The app reads the C@MPUS structure and study list live once the assistant server is configured.',
    f4Title: 'Assistant',
    f4Body: 'Ask about deadlines, credits, modules or rooms — answered from your own record.',
    f5Title: 'UniMail',
    f5Body: 'Read, search and sort your mailbox over IMAP once the server is connected.',
    f6Title: 'Campus map',
    f6Body: 'Buildings, rooms and contact points on the university map.',
    f7Title: 'Notes & past exams',
    f7Body: 'Peer ratings, shared notes and topics from earlier exams.',
    f8Title: 'Campus services',
    f8Body: 'PaperCut printing and network access, explained step by step.',

    statusKicker: 'Status',
    statusTitle: 'What works now — and what is still demo',
    statusLead:
      'The app mixes live reads with a fictional demonstration record. This table says which is which.',
    statusCaption: 'Status overview: live, demo and limited',
    statusH1: 'Area',
    statusH2: 'Status',
    statusH3: 'What it means',
    status1Area: 'C@MPUS structure & studies',
    status1Detail: 'The app reads the structure and study list when the assistant server is configured.',
    status2Area: 'SIAM sign-in',
    status2Detail: 'Opens the identity provider; the OIDC client registration with TIK is required.',
    status3Area: 'UniMail',
    status3Detail: 'IMAP access through the assistant server; read-only once connected.',
    status4Area: 'Timetable, grades, ECTS',
    status4Detail: 'Fictional record of Lena Hartmann.',
    status5Area: 'ILIAS, SDG, deadlines, news, past exams',
    status5Detail: 'Fictional content; no live sync.',
    status6Area: 'Campus map',
    status6Detail: 'Map from maps.uni-stuttgart.de; the external page loads when you open it.',
    status7Area: 'VPN',
    status7Detail: 'Android engine builds; iOS tunnel and device test are still missing.',
    status8Area: 'App Store / TestFlight',
    status8Detail: 'Beta via Tally; no store build.',
    status9Area: 'Web',
    status9Detail: 'Export works; C@MPUS browser sign-in and VPN do not.',
    badgeLive: 'Live',
    badgeDemo: 'Demo',
    badgeExternal: 'External',
    badgeDev: 'Dev build',
    badgeUnavailable: 'Not available',
    badgeLimited: 'Limited',
    statusNote: 'Demo data is fictional. Official university notices always take precedence.',

    aKicker: 'Assistant',
    aTitle: 'The assistant knows where you stand',
    aLead:
      'The answer is built on the device first — instantly and without a network. If an assistant server is configured, Grok can rewrite it afterwards; without a server everything stays local.',
    a1: 'Local record, instant answer — the server is optional.',
    a2: 'Sources under every answer: C@MPUS, ILIAS, SDG Campus.',
    a3: 'Optional Grok path: question and context go to the assistant server when one is configured. There is no separate switch in the beta yet.',
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
    c1: 'Campus map with buildings, rooms and contact points. The map is loaded from maps.uni-stuttgart.de.',
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

    tKicker: 'Privacy & data flow',
    tTitle: 'What stays local — and what leaves the device',
    tLead:
      'The app works locally first. The optional assistant server, UniMail and the campus map are the points where data leaves the device. The full notice is in the privacy policy.',
    t1Title: 'Local first',
    t1Body:
      'Timetable, grades, notes and chat live in the app storage on the device. That storage is not encrypted; on a shared device the data is readable. The assistant server is optional.',
    t2Title: 'C@MPUS password',
    t2Body:
      'With the manual sign-in you type it only on the university page. The optional automatic sign-in stores it in the device vault (SecureStore), not on the server.',
    t3Title: 'UniMail password',
    t3Body:
      'For IMAP it goes to the assistant server and stays in process memory; it is not stored on the device and not logged. Disconnecting or signing out deletes it.',
    t4Title: 'xAI / Grok',
    t4Body:
      'Only with an assistant server and an xAI key configured can Grok rewrite an answer. The question, the last chat turns and the local fact sheet go to the server and to xAI. Without a server the answer stays local.',
    tNote:
      'University Assistant is a student demonstration project. It is not a service of the University of Stuttgart, does not use the official logo, and Lena Hartmann’s grades are fictional.',
    tNoteLink: 'Full privacy notice',

    faqKicker: 'FAQ',
    faqTitle: 'Frequent questions',
    faqLead: 'Short answers to the questions that come up most often before the beta.',
    faqQ1: 'Is University Assistant official?',
    faqA1:
      'No. It is a student project and not a service of the University of Stuttgart. It does not use the official logo or official records.',
    faqQ2: 'What does the app cost?',
    faqA2: 'Nothing. The code is AGPL-3.0-or-later, the beta is free, and there are no in-app purchases.',
    faqQ3: 'Where is my data?',
    faqA3: 'On the device first. The assistant server is optional. The full description is in the',
    faqA3Link: 'privacy notice',
    faqQ4: 'What happens to my password?',
    faqA4:
      'With the manual C@MPUS sign-in you type it only on the university page. The optional automatic sign-in stores it in the device vault. For UniMail it goes to the assistant server and stays in process memory; it is not stored on the device and not logged.',
    faqQ5: 'What data goes to xAI?',
    faqA5:
      'Only when an assistant server with an xAI key is configured: the question, the last chat turns and the local fact sheet. Without a server the answer stays local.',
    faqQ6: 'Can I test the app?',
    faqA6: 'For now only through beta registration. There is no App Store or TestFlight link yet.',
    faqA6Link: 'Register for the beta',
    faqQ7: 'How can I help or report a security issue?',
    faqA7: 'Through GitHub issues, pull requests or email. Please report security issues confidentially to',

    ctaKicker: 'Open source',
    ctaTitle: 'Open, traceable, runnable',
    ctaLead:
      'The code is on GitHub under AGPL-3.0-or-later. Build it, test it, change it — the checks run with a single command.',
    ctaBeta: 'Register for the beta',
    ctaGithub: 'Go to the repository',
    ctaDocs: 'Documentation',

    footerDocs: 'Documentation',
    footerLicense: 'Licence',
    footerImprint: 'Legal notice',
    footerPrivacy: 'Privacy',
    footerAccessibility: 'Accessibility',
    footerSecurity: 'Security',
    footerContact: 'Contact',
    footerLine1:
      '© 2026 Oliver Molnar, Keltenstraße 8, 71723 Großbottwar. University Assistant is a student demonstration project and not a service of the University of Stuttgart.',
    footerLine2:
      'Structured data, grades and deadlines (Lena Hartmann) are fictional. The colours follow the university’s published corporate colours; the mark is an original pairing of two circles, not the signet.',
    footerLine3:
      'Licence: GNU Affero General Public License, version 3 or later. Parts of the code were written with AI support; the assistant optionally uses xAI Grok.',
    footerLine4: 'C@MPUS, ILIAS, UniMail, SIAM and PaperCut are trademarks of their respective owners.',
    footerStand: 'Last updated: 19 October 2026.',
  };

  const enAria = {
    ariaNav: 'Main navigation',
    ariaLang: 'Language / Sprache',
    ariaTheme: 'Toggle colour theme',
    ariaMenu: 'Menu',
    ariaFooter: 'Footer',
    ariaLightbox: 'Image',
    ariaClose: 'Close',
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
    'University Assistant brings timetable, credits, deadlines, ILIAS, campus map and UniMail together. A student project, not a University of Stuttgart service.';

  const langStatus = document.getElementById('lang-status');

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
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.dataset.i18nAria;
      const value = lang === 'en' ? (enAria[key] ?? deAria[key]) : deAria[key];
      if (value) el.setAttribute('aria-label', value);
    });
    document.title = lang === 'en' ? enTitle : deTitle;
    if (metaDescription) metaDescription.setAttribute('content', lang === 'en' ? enDescription : deDescription);
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });
    if (langStatus) {
      langStatus.textContent = lang === 'en' ? 'Language: English' : 'Sprache: Deutsch';
    }
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

  /* ---------- mobile navigation ---------- */

  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');

  function setNavOpen(open) {
    if (!navToggle || !nav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setNavOpen(false));
    });
    document.addEventListener('click', (event) => {
      if (navToggle.getAttribute('aria-expanded') !== 'true') return;
      if (header && !header.contains(event.target)) setNavOpen(false);
    });
    const desktop = window.matchMedia('(min-width: 961px)');
    const onChange = () => {
      if (desktop.matches) setNavOpen(false);
    };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange);
    else desktop.addListener(onChange);
  }

  /* ---------- scroll reveal ---------- */

  const revealed = Array.from(document.querySelectorAll('.reveal'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealAll() {
    revealed.forEach((el) => {
      el.classList.remove('reveal-init');
      el.classList.add('in');
    });
  }

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    try {
      revealed.forEach((el) => el.classList.add('reveal-init'));
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
    } catch {
      revealAll();
    }
  }

  /* ---------- lightbox ---------- */

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = lightbox ? lightbox.querySelector('img') : null;
  const lightboxClose = document.getElementById('lightbox-close');
  const inertTargets = [
    document.querySelector('.site-header'),
    document.querySelector('main'),
    document.querySelector('.site-footer'),
    document.querySelector('.skip'),
  ].filter(Boolean);
  let lastFocus = null;

  function setBackgroundInert(inert) {
    inertTargets.forEach((el) => {
      if (inert) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains('show')) return;
    lightbox.classList.remove('show');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    setBackgroundInert(false);
    if (lightboxImage) lightboxImage.removeAttribute('src');
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
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      setBackgroundInert(true);
      if (lightboxClose) lightboxClose.focus();
    });
  });

  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = lightbox.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeLightbox();
        setNavOpen(false);
      }
    });
  }
})();
