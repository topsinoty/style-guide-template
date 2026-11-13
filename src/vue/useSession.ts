import { inject, markRaw, provide, shallowRef, triggerRef, type InjectionKey, type ShallowRef } from 'vue';
import { tryOnScopeDispose } from '@vueuse/core';
import type { Session } from '../app/session.js';

const SESSION: InjectionKey<ShallowRef<Session>> = Symbol('session');

export function provideSession(session: Session) {
  const live = shallowRef(markRaw(session));
  tryOnScopeDispose(session.subscribe(() => triggerRef(live)));
  provide(SESSION, live);
  return live;
}

export function injectSession() {
  const live = inject(SESSION);
  if (!live) throw new Error('The session is provided by App.');
  return live;
}
