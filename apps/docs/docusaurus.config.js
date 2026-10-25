// @ts-check
// Note: type annotations allow type checking and autocomplete!

// The docs ship as the `/docs/` half of the GitHub Pages site (see
// `.github/workflows/pages.yml`); a local `bun run docs` keeps the `/` default.
const homeHref = process.env.DOCS_HOME_HREF;
const siteUrl = process.env.DOCS_URL ?? 'http://localhost:3000';
const baseUrl = process.env.DOCS_BASE_URL ?? '/';
const basePath = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
const legalBase = `${siteUrl.replace(/\/$/, '')}${basePath}`;

const config = /** @type {import('@docusaurus/types').Config} */ ({
  title: 'University Assistant',
  tagline: 'A study assistant for University of Stuttgart students',
  favicon: 'img/favicon.ico',

  // Full URL and path prefix. Set in the Pages workflow; overridden for local runs.
  url: siteUrl,
  baseUrl,

  organizationName: '403access',
  projectName: 'stuttgart-uni-assistant',

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // The canonical Markdown source stays in the repo root `docs/` folder;
          // this site only renders it.
          path: '../../docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/403access/stuttgart-uni-assistant/edit/main/apps/docs/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'University Assistant',
        items: [
          { to: '/docs', label: 'Product', position: 'left' },
          { to: '/docs/sdlc/overview', label: 'Lifecycle', position: 'left' },
          { to: '/docs/engineering/architecture', label: 'Engineering', position: 'left' },
          { to: '/docs/delivery/backlog', label: 'Delivery', position: 'left' },
          ...(homeHref ? [{ href: homeHref, label: 'App', position: 'right' }] : []),
          {
            href: 'https://github.com/403access/stuttgart-uni-assistant',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Project',
            items: [
              { label: 'Documentation', to: '/docs' },
              {
                label: 'GitHub',
                href: 'https://github.com/403access/stuttgart-uni-assistant',
              },
              {
                label: 'Licence',
                href: 'https://github.com/403access/stuttgart-uni-assistant/blob/main/LICENSE',
              },
            ],
          },
          {
            title: 'Legal',
            items: [
              { label: 'Impressum', href: `${legalBase}impressum/` },
              { label: 'Datenschutz', href: `${legalBase}datenschutz/` },
              { label: 'Barrierefreiheit', href: `${legalBase}impressum/#barrierefreiheit` },
              {
                label: 'Sicherheit',
                href: 'https://github.com/403access/stuttgart-uni-assistant/blob/main/SECURITY.md',
              },
              { label: 'Kontakt', href: 'mailto:uni-assistant@olimo.me' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Oliver Molnar. University Assistant is a student demonstration and not affiliated with the University of Stuttgart. The German legal notice and privacy policy are authoritative.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.githubLight,
        darkTheme: require('prism-react-renderer').themes.githubDark,
      },
    }),
});

module.exports = config;
