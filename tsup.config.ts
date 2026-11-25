import { defineConfig } from 'tsup';

// Two builds: renderer (bundled again by the shell's Vite) and main (loaded from node_modules).
// They run in parallel, so neither cleans; the build script deletes dist first.
export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    platform: 'browser',
    target: 'es2022',
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: false,
    loader: { '.png': 'dataurl' },
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom', 'ghost-in-shell-sdk'],
  },
  {
    entry: { main: 'src/main.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    dts: true,
    sourcemap: true,
    clean: false,
    external: ['ghost-in-shell-sdk'],
  },
]);
