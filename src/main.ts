import { createApp } from 'vue';
import { fontsource } from './adapters/fontsource.js';
import { indexedDbFileStore } from './adapters/indexeddb-file-store.js';
import {
  memoryFileStore,
  memoryKeyValueStore,
  readOnlyFileStore,
  readOnlyKeyValueStore,
} from './adapters/memory.js';
import { zodValidator } from './adapters/zod-validator.js';
import { readMode } from './app/mode.js';
import { Session } from './app/session.js';
import App from './vue/App.vue';

const mode = readMode(location.search, import.meta.env.VITE_PUBLIC_BRAND);
const stores = {
  private: () => ({ drafts: localStorage, files: indexedDbFileStore() }),
  preview: () => ({
    drafts: readOnlyKeyValueStore(localStorage),
    files: readOnlyFileStore(indexedDbFileStore()),
  }),
  public: () => ({ drafts: memoryKeyValueStore(), files: memoryFileStore() }),
}[mode.kind]();

const session = await Session.open({
  ...stores,
  fonts: fontsource({ cache: localStorage }),
  validator: zodValidator,
  brand: mode.kind === 'public' ? mode.brand : undefined,
  editable: mode.kind === 'private',
});
const mount = document.createElement('div');
document.body.prepend(mount);
createApp(App, { session, mode }).mount(mount);
