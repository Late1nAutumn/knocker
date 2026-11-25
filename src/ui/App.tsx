import type { ToolRootProps } from 'ghost-in-shell-sdk';
import { ApiProvider } from './api.js';
import { KnockerPage } from './KnockerPage.js';
import { CSS } from './styles.js';

/** Root: one page, so no routes are needed. */
export default function App({ api }: ToolRootProps) {
  return (
    <ApiProvider api={api}>
      <style>{CSS}</style>
      <KnockerPage />
    </ApiProvider>
  );
}
