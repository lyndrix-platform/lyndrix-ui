/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional: consumers fall back to a default when unset, so it may be undefined.
  readonly VITE_CORE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
