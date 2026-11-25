import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ToolRendererApi } from 'ghost-in-shell-sdk';
import type { EventChannel, Events, ReqOf, RequestChannel, ResOf } from '../shared/channels.js';
import { messages, normLang, type Lang, type Messages } from '../shared/i18n.js';

export interface TypedApi {
  raw: ToolRendererApi;
  call<C extends RequestChannel>(channel: C, ...payload: ReqOf<C> extends void ? [] : [ReqOf<C>]): Promise<ResOf<C>>;
}

const ApiContext = createContext<TypedApi | null>(null);
const LangContext = createContext<Lang>('en');

export function ApiProvider({ api, children }: { api: ToolRendererApi; children: ReactNode }) {
  const ref = useRef<TypedApi | null>(null);
  if (!ref.current || ref.current.raw !== api) {
    ref.current = {
      raw: api,
      call: ((channel: string, payload?: unknown) => api.invoke(channel, payload)) as TypedApi['call'],
    };
  }
  const [lang, setLang] = useState<Lang>(() => normLang(api.language));
  useEffect(() => {
    setLang(normLang(api.language));
    return api.onLanguageChange((l) => setLang(normLang(l)));
  }, [api]);
  return (
    <ApiContext.Provider value={ref.current}>
      <LangContext.Provider value={lang}>{children}</LangContext.Provider>
    </ApiContext.Provider>
  );
}

export function useApi(): TypedApi {
  const v = useContext(ApiContext);
  if (!v) throw new Error('useApi outside ApiProvider');
  return v;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): Messages {
  return messages(useContext(LangContext));
}

/** Subscribes to a main-side event for the lifetime of the component. */
export function useEvent<C extends EventChannel>(channel: C, cb: (payload: Events[C]) => void): void {
  const api = useApi();
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => api.raw.on<Events[C]>(channel, (p) => cbRef.current(p)), [api, channel]);
}

/** The window the UI currently lives in (changes when the tool is detached). */
export function useCurrentWindow(): Window {
  const api = useApi();
  const [win, setWin] = useState<Window>(() => api.raw.currentWindow());
  useEffect(() => api.raw.onWindowChange((w) => setWin(w)), [api]);
  return win;
}
