/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Set from `SHOWCASE=1` at build time — see astro.config.mjs. */
  readonly SHOWCASE: boolean;
}

interface Window {
  toggleTheme: () => void;
}
