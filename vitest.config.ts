import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';

/** Mirrors tsup's dataurl loader for .png imports. */
function pngDataUrl(): Plugin {
  return {
    name: 'png-dataurl',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.png')) return null;
      const b64 = readFileSync(id).toString('base64');
      return `export default ${JSON.stringify(`data:image/png;base64,${b64}`)};`;
    },
  };
}

export default defineConfig({
  plugins: [pngDataUrl()],
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
