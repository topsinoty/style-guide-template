import {
  type App,
  inject,
  markRaw,
  shallowRef,
  triggerRef,
  type InjectionKey,
  type ShallowRef,
} from 'vue';
import type { Session } from '~/app';

const SESSION: InjectionKey<ShallowRef<Session>> = Symbol('session');

export function provideSession(app: App, session: Session) {
  const live = shallowRef(markRaw(session));
  app.onUnmount(session.subscribe(() => triggerRef(live)));
  app.provide(SESSION, live);
}

export function injectSession() {
  const live = inject(SESSION);
  if (!live) throw new Error('The session is provided by App.');
  return live;
}
