// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { assertValidToolModule, createFakeRendererApi } from 'ghost-in-shell-sdk/testing';
import toolModule from '../src/index.js';
import App from '../src/ui/App.js';
import Popup from '../src/ui/Popup.js';
import { DEFAULT_SETTINGS, type Settings, type Snapshot } from '../src/shared/types.js';

afterEach(cleanup);

function snap(over: Partial<Snapshot['timer']> = {}, settings: Partial<Settings> = {}): Snapshot {
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    timer: { phase: 'counting', deadline: Date.now() + 90 * 60_000, periodMs: 120 * 60_000, ringingSince: null, ...over },
    previewing: false,
    soundFailed: false,
  };
}

function renderApp(initial: Snapshot, extra: Record<string, (p: unknown) => unknown> = {}, language: 'en' | 'zh-CN' = 'en') {
  const calls: { channel: string; payload: unknown }[] = [];
  let current = initial;
  const record = (channel: string, fn: (p: unknown) => unknown) => (p: unknown) => {
    calls.push({ channel, payload: p });
    return fn(p);
  };
  const api = createFakeRendererApi({
    toolId: 'knocker',
    language,
    handlers: {
      'state.get': () => current,
      'ui.presence': () => undefined,
      'settings.save': record('settings.save', (p) => {
        current = { ...current, settings: { ...current.settings, ...(p as Partial<Settings>) } };
        return current;
      }),
      'timer.stop': record('timer.stop', () => {
        current = snap({ phase: 'stopped', deadline: null, periodMs: null });
        return current;
      }),
      'alarm.confirm': record('alarm.confirm', () => {
        current = snap();
        return current;
      }),
      ...extra,
    },
  });
  render(<App api={api} basePath="/tools/knocker" />);
  return { api, calls };
}

describe('tool module', () => {
  it('is valid', () => {
    assertValidToolModule(toolModule, 'knocker');
  });
});

describe('page', () => {
  it('shows the countdown and stops the timer', async () => {
    const { calls } = renderApp(snap());
    expect(await screen.findByText('Counting down')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toMatch(/^01:(29|30):\d\d$/);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(await screen.findByText('Stopped')).toBeTruthy();
    expect(calls.map((c) => c.channel)).toContain('timer.stop');
  });

  it('saves a preset interval', async () => {
    const { calls } = renderApp(snap());
    await screen.findByText('Settings');
    fireEvent.click(screen.getAllByRole('button', { name: '30' })[0]!);
    await screen.findByText('Saved');
    expect(calls).toContainEqual({ channel: 'settings.save', payload: { intervalMinutes: 30 } });
  });

  it('clamps a typed interval on blur', async () => {
    const { calls } = renderApp(snap());
    const input = (await screen.findAllByRole('spinbutton'))[0]!;
    fireEvent.change(input, { target: { value: '5000' } });
    fireEvent.blur(input);
    await waitFor(() => expect(calls).toContainEqual({ channel: 'settings.save', payload: { intervalMinutes: 1440 } }));
  });

  it('shows the in-app reminder while ringing and confirms', async () => {
    const { api, calls } = renderApp(snap({ phase: 'ringing', deadline: null, periodMs: null, ringingSince: Date.now() }, { message: 'Stand up' }));
    const overlay = within(api.overlayContainer);
    await overlay.findByRole('alertdialog');
    expect(api.overlayContainer.textContent).toContain('Stand up');
    fireEvent.click(overlay.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(overlay.queryByRole('alertdialog')).toBeNull());
    expect(calls.map((c) => c.channel)).toContain('alarm.confirm');
  });

  it('follows the shell language', async () => {
    const { api } = renderApp(snap({ phase: 'stopped', deadline: null, periodMs: null }));
    expect(await screen.findByText('Stopped')).toBeTruthy();
    api.setLanguage('zh-CN');
    expect(await screen.findByText('已停止')).toBeTruthy();
    expect(screen.getByText('设置')).toBeTruthy();
  });

  it('shows a sound error from preview', async () => {
    const err = Object.assign(new Error('decode'), { code: 'GHOST_SOUND_FAILED' });
    renderApp(snap({}, { audioPath: 'C:\\a.mp3' }), {
      'audio.preview': () => {
        throw err;
      },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Preview' }));
    expect((await screen.findByRole('alert')).textContent).toContain('could not be played');
  });
});

describe('popup', () => {
  const base = { language: 'en' as const, palette: '', dismiss: () => undefined };

  it('sends confirm and snooze to main', () => {
    const actions: string[] = [];
    render(
      <Popup
        {...base}
        data={{ message: 'Stand up', snoozeMinutes: 10, ringingSince: Date.now() }}
        open={() => undefined}
        action={(id) => actions.push(id)}
      />,
    );
    expect(screen.getByText('Stand up')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Snooze 10 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(actions).toEqual(['snooze', 'confirm']);
  });

  it('opens the tool and falls back to the localized default text', () => {
    let opened = 0;
    render(
      <Popup
        {...base}
        language="zh-CN"
        data={{ message: '', snoozeMinutes: 5, ringingSince: Date.now() }}
        open={() => opened++}
        action={() => undefined}
      />,
    );
    expect(screen.getByText('该休息一下了！')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '打开 Knocker' }));
    expect(opened).toBe(1);
  });
});
