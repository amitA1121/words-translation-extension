import { defineConfig } from 'wxt';

// WXT generates the manifest; only what can't be inferred from the
// entrypoints is declared here. Storage keys are unchanged from v1, so an
// existing installation keeps its saved words.
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Lexigo',
    description:
      'לחץ על מילה באנגלית, קבל תרגום לעברית, וסמן אותה אוטומטית בכל מקום שהיא מופיעה - כולל קבצי PDF.',
    permissions: ['storage', 'activeTab', 'tabs', 'contextMenus'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Lexigo'
    },
    icons: {
      16: '/icons/icon16.png',
      48: '/icons/icon48.png',
      128: '/icons/icon128.png'
    },
    web_accessible_resources: [
      {
        resources: ['pdf-viewer.html'],
        matches: ['<all_urls>']
      }
    ]
  }
});
