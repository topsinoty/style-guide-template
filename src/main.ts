import { createApp } from 'vue';
import {
  fontsource,
  indexedDbFileStore,
  memoryFileStore,
  memoryKeyValueStore,
  readOnlyFileStore,
  readOnlyKeyValueStore,
  zodValidator,
} from '~/adapters';
import { readMode, Session } from '~/app';
import { App, provideSession } from '~/vue';

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
