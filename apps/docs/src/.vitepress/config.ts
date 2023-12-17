import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'webcrack',
  description: 'Deobfuscate, unminify and unpack bundled javascript',
  base: '/docs/',
  outDir: '../dist/docs',
  head: [
    [
      'link',
      {
        rel: 'icon',
        href: 'https://user-images.githubusercontent.com/55899582/231488871-e83fb827-1b25-4ec9-a326-b14244677e87.png',
      },
    ],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: 'https://user-images.githubusercontent.com/55899582/231488871-e83fb827-1b25-4ec9-a326-b14244677e87.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Playground', link: 'https://webcrack.netlify.app' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'CLI', link: '/guide/cli' },
          { text: 'Node.js API', link: '/guide/api' },
          { text: 'Website', link: '/guide/web' },
        ],
      },
      {
        text: 'Concepts',
        items: [
          { text: 'Deobfuscation', link: '/concepts/deobfuscate' },
          { text: 'Unminifying', link: '/concepts/unminify' },
          { text: 'Bundle Unpacking', link: '/concepts/unpack' },
          { text: 'JSX', link: '/concepts/jsx' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/j4k0xb/webcrack' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/j4k0xb/webcrack-ui/edit/master/docs/:path',
    },
  },
});
