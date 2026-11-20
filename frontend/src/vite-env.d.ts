/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_MAP_TILE_URL?: string; // Story 15.1 — tile CARTO kèm key; không có → OSM
}
