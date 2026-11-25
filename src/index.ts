import { lazy } from 'react';
import { defineTool } from 'ghost-in-shell-sdk';
import { TOOL_ID } from './shared/types.js';
import iconUrl from './ui/assets/icon.png';

export default defineTool({
  id: TOOL_ID,
  name: { en: 'Knocker', 'zh-CN': 'Knocker 定时提醒' },
  icon: { src: iconUrl },
  Root: lazy(() => import('./ui/App.js')),
  Notification: lazy(() => import('./ui/Popup.js')),
  window: { minWidth: 480, minHeight: 520 },
});
