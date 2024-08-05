// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
import type { Config } from '@docusaurus/types';
import { themes } from 'prism-react-renderer';

const lightCodeTheme = themes.duotoneLight;
const darkCodeTheme = themes.oceanicNext;
const config: Config = {
  title: 'EMS-ESP title',
  tagline: 'TODO tagline stuff',
  url: 'http://ems-esp.derbyshire.nl',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'emsesp', // Usually your GitHub org/user name.
  projectName: 'EMS-ESP32', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    localeConfigs: {
      en: {
        htmlLang: 'en-GB'
      }
    }
  },
  scripts: ['/iconfont/iconfont.js'],
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/emsesp/emsesp.github.io/blob/main/',
          lastVersion: 'current',
          versions: {
            current: {
              label: 'v3'
            }
          }
        },
        // disable blog
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.scss')
        }
      }
    ]
  ],

  stylesheets: [
    'https://rsms.me/inter/inter.css',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap'
  ],
  themeConfig: {
    image: '/img/card_image.jpg',
    metadata: [{ name: 'twitter:site', content: '@alovajs' }],
    navbar: {
      title: '',
      logo: {
        alt: 'EMS-ESP',
        src: 'img/logo-text.svg'
      },
      items: [
        {
          type: 'dropdown',
          label: 'Docs',
          position: 'left',
          items: [
            {
              label: 'Getting Started',
              to: 'tutorial/getting-started/introduce'
            },
            {
              label: 'Request Adapter',
              to: 'resource/request-adapter'
            },
            {
              label: 'Storage Adapter',
              to: 'resource/storage-adapter'
            },
            {
              label: 'UI Frameworks',
              to: 'category/framework'
            },
            {
              label: 'Error Reference',
              to: 'error'
            }
          ]
        },
        {
          to: 'examples',
          position: 'left',
          label: 'Example'
        },
        {
          to: 'api/alova',
          position: 'left',
          label: 'API'
        },
        {
          type: 'dropdown',
          label: 'About',
          position: 'left',
          items: [
            {
              label: 'Request Scene Model',
              to: 'about/RSM'
            },
            {
              label: 'Comparison',
              to: 'about/comparison'
            },
            {
              label: 'Q&A',
              to: 'about/qa'
            }
          ]
        },
        {
          type: 'dropdown',
          label: 'Contributing',
          position: 'left',
          items: [
            {
              label: 'Contributing Guidelines',
              to: 'contributing/overview'
            },
            {
              label: 'Become core member',
              to: 'contributing/become-core-member'
            },
            {
              label: 'Developing Guidelines',
              to: 'contributing/developing-guidelines'
            },
            {
              label: 'Code of conduct',
              to: 'contributing/code-of-conduct'
            }
          ]
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true
        },
        {
          type: 'localeDropdown',
          position: 'right'
        },
        {
          to: 'https://github.com/alovajs/alova/releases',
          position: 'right',
          label: 'Releases'
        },
        {
          href: 'https://x.com/alovajs',
          className: 'header-x-link',
          position: 'right'
        },
        {
          href: 'https://discord.gg/S47QGJgkVb',
          className: 'header-discord-link',
          position: 'right'
        },
        {
          href: 'https://github.com/alovajs/alova',
          className: 'header-github-link',
          position: 'right'
        }
      ]
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true
    },
    announcementBar: {
      id: 'support_us',
      content: `⭐️
          If you also like alova, 
          <a
            href="https://github.com/alovajs/alova"
            target="_blank">
            star it on GitHub!
          </a>
          ⭐️`,
      backgroundColor: 'var(--ifm-color-primary-light)',
      textColor: '#fff',
      isCloseable: false
    },
    footer: {
      style: 'light',
      logo: {
        alt: 'Meta Open Source Logo',
        src: 'img/logo.svg',
        href: 'https://opensource.fb.com',
        width: 160,
        height: 51
      },

      links: [
        {
          title: 'Document',
          items: [
            {
              label: 'Docs',
              to: 'tutorial/getting-started/introduce'
            },
            {
              label: 'Example',
              to: 'examples'
            },
            {
              label: 'API',
              to: 'api/alova'
            },
            {
              label: 'Contributing',
              to: 'contributing/overview'
            }
          ]
        },
        {
          title: 'Resource',
          items: [
            {
              label: 'Request Adapter',
              to: 'resource/request-adapter'
            },
            {
              label: 'Storage Adapter',
              to: 'resource/storage-adapter'
            },
            {
              label: 'Framework Support',
              to: 'category/framework'
            }
          ]
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              to: 'https://discord.gg/S47QGJgkVb'
            }
          ]
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              to: 'https://github.com/alovajs/alova'
            },
            {
              label: 'Issues',
              to: 'https://github.com/alovajs/alova/issues'
            },
            {
              label: 'Pull request',
              to: 'https://github.com/alovajs/alova/pulls'
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Proddy & MichaelDvP`
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,

      // https://github.com/facebook/docusaurus/discussions/9506#discussioncomment-7506183
      additionalLanguages: ['javascript', 'bash']
    },

    algolia: {
      // TODO change
      // The application ID provided by Algolia
      appId: 'WO709JPVEM',

      // Public API key: it is safe to commit it
      // TODO change
      apiKey: 'ff05ec20afa31e36ccad47b15fe4951c',

      indexName: 'emsesp_website',

      // Optional: see doc section below
      contextualSearch: true,

      // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
      externalUrlRegex: 'external\\.com|domain\\.com',

      // Optional: Replace parts of the item URLs from Algolia. Useful when using the same search index for multiple deployments using a different baseUrl. You can use regexp or string in the `from` param. For example: localhost:3000 vs myCompany.com/docs
      replaceSearchResultPathname: {
        from: '/docs/', // or as RegExp: /\/docs\//
        to: '/'
      },

      // Optional: Algolia search parameters
      searchParameters: {},

      // Optional: path for search page that enabled by default (`false` to disable it)
      searchPagePath: 'search'
    }
  },

  markdown: {
    mermaid: true
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: ['docusaurus-plugin-sass']
};

export default config;
