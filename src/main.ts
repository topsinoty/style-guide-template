import { createApp } from 'vue';
import { fontsource } from './adapters/fontsource';
import { indexedDbFileStore } from './adapters/indexeddb-file-store';
import {
  memoryFileStore,
  memoryKeyValueStore,
  readOnlyFileStore,
  readOnlyKeyValueStore,
} from './adapters/memory';
import { zodValidator } from './adapters/zod-validator';
import { readMode } from './app/mode';
import { Session } from './app/session';
import App from './vue/App.vue';
import { provideSession } from './vue/useSession';

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
const app = createApp(App, { mode });
provideSession(app, session);
app.mount(mount);
