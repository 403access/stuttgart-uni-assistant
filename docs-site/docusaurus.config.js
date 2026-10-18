// @ts-check
// Note: type annotations allow type checking and autocomplete!

const config = /** @type {import('@docusaurus/types').Config} */ ({
  title: 'University Assistant',
  tagline: 'A study assistant for University of Stuttgart students',
  favicon: 'img/favicon.ico',

  // Full URL if the docs site is deployed to a custom domain.
  url: 'https://your-docusaurus-site.example.com',
  // /<baseUrl>/pathname under which the site is served.
  baseUrl: '/',

  organizationName: '403access',
  projectName: 'university-assistant',

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
          path: '../docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/403access/stuttgart-uni-assistant/edit/main/docs-site/',
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
          {
            href: 'https://github.com/403access/stuttgart-uni-assistant',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} University Assistant (student demonstration, not affiliated with the University of Stuttgart). Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.githubLight,
        darkTheme: require('prism-react-renderer').themes.githubDark,
      },
    }),
});

module.exports = config;
