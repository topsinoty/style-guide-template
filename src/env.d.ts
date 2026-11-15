interface ImportMetaEnv {
  readonly VITE_PUBLIC_BRAND?: string;
}
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent;
  export default component;
}
