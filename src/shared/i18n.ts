export type Lang = 'en' | 'zh-CN';

/** Unknown values fall back to English (GUIDE 7.9). */
export function normLang(v: unknown): Lang {
  return v === 'zh-CN' ? 'zh-CN' : 'en';
}

const en = {
  appName: 'Knocker',
  defaultMessage: 'Time for a break!',
  dial: {
    stopped: 'Not running',
    counting: 'Next reminder in',
    snoozing: 'Snoozed, again in',
    ringing: 'Now',
    at: (time: string) => `at ${time}`,
  },
  title: {
    stopped: 'Stopped',
    counting: 'Counting down',
    snoozing: 'Snoozed',
    ringing: "Time's up",
  },
  hint: {
    stopped: 'Start the timer to count down a full interval.',
    counting: (m: number, time: string) => `Reminds you every ${m} min. Next reminder at ${time}.`,
    snoozing: (time: string) => `Reminding you again at ${time}.`,
    ringing: (time: string) => `Reminding since ${time}. The timer waits until you confirm.`,
  },
  actions: {
    start: 'Start',
    stop: 'Stop',
    restart: 'Restart timer',
    confirm: 'Confirm',
    snooze: (m: number) => `Snooze ${m} min`,
    open: 'Open Knocker',
    close: 'Close',
  },
  settings: {
    title: 'Settings',
    interval: 'Remind every',
    snooze: 'Snooze for',
    minutes: 'min',
    intervalHint: 'A new interval takes effect from the next countdown. Restart the timer to apply it now.',
    audio: 'Sound',
    audioNone: 'No sound. The reminder is silent.',
    audioChoose: 'Choose file',
    audioPreview: 'Preview',
    audioStopPreview: 'Stop preview',
    audioClear: 'Remove sound',
    audioFormats: 'MP3, WAV, OGG, Opus, FLAC, M4A, AAC or WebM. Plays in a loop until you confirm.',
    message: 'Reminder text',
    messagePlaceholder: 'Time for a break!',
    saved: 'Saved',
    saving: 'Saving',
  },
  errors: {
    generic: 'Something went wrong.',
    soundFailed: 'The sound could not be played. Check that the file exists and is a supported format.',
    ringSoundFailed: 'The reminder sound could not be played.',
  },
  dialog: {
    audioTitle: 'Choose a reminder sound',
    audioFilter: 'Audio files',
  },
  tray: {
    counting: (left: string) => `Knocker - next reminder in ${left}`,
    snoozing: (left: string) => `Knocker - snoozed, ${left} left`,
    ringing: 'Knocker - reminding now',
    stopped: 'Knocker - stopped',
    open: 'Open Knocker',
    start: 'Start',
    stop: 'Stop',
    restart: 'Restart timer',
    confirm: 'Confirm',
    snooze: (m: number) => `Snooze ${m} min`,
  },
  duration: {
    lessThanMinute: 'less than 1 min',
    minutes: (m: number) => `${m} min`,
    hours: (h: number, m: number) => (m === 0 ? `${h} h` : `${h} h ${m} min`),
  },
};

export type Messages = typeof en;

const zhCN: Messages = {
  appName: 'Knocker',
  defaultMessage: '该休息一下了！',
  dial: {
    stopped: '未运行',
    counting: '距下次提醒',
    snoozing: '稍后提醒，还有',
    ringing: '现在',
    at: (time) => `${time} 提醒`,
  },
  title: {
    stopped: '已停止',
    counting: '计时中',
    snoozing: '稍后提醒',
    ringing: '时间到了',
  },
  hint: {
    stopped: '开始计时后，将按完整的提醒间隔倒数。',
    counting: (m, time) => `每 ${m} 分钟提醒一次，下次提醒在 ${time}。`,
    snoozing: (time) => `将在 ${time} 再次提醒。`,
    ringing: (time) => `${time} 开始提醒。确认之前计时会一直暂停。`,
  },
  actions: {
    start: '开始',
    stop: '停止',
    restart: '重新开始计时',
    confirm: '确认',
    snooze: (m) => `稍后提醒（${m} 分钟）`,
    open: '打开 Knocker',
    close: '关闭',
  },
  settings: {
    title: '设置',
    interval: '提醒间隔',
    snooze: '稍后提醒',
    minutes: '分钟',
    intervalHint: '新的提醒间隔从下一次开始计时起生效；想立即生效，请重新开始计时。',
    audio: '提醒音频',
    audioNone: '未设置音频，提醒时不发声。',
    audioChoose: '选择文件',
    audioPreview: '试听',
    audioStopPreview: '停止试听',
    audioClear: '移除音频',
    audioFormats: '支持 MP3、WAV、OGG、Opus、FLAC、M4A、AAC、WebM，提醒时循环播放直到确认。',
    message: '提示文字',
    messagePlaceholder: '该休息一下了！',
    saved: '已保存',
    saving: '正在保存',
  },
  errors: {
    generic: '操作失败。',
    soundFailed: '无法播放该音频，请检查文件是否存在、格式是否受支持。',
    ringSoundFailed: '提醒音频无法播放。',
  },
  dialog: {
    audioTitle: '选择提醒音频',
    audioFilter: '音频文件',
  },
  tray: {
    counting: (left) => `Knocker - 距下次提醒 ${left}`,
    snoozing: (left) => `Knocker - 稍后提醒，还有 ${left}`,
    ringing: 'Knocker - 正在提醒',
    stopped: 'Knocker - 已停止',
    open: '打开 Knocker',
    start: '开始',
    stop: '停止',
    restart: '重新开始计时',
    confirm: '确认',
    snooze: (m) => `稍后提醒（${m} 分钟）`,
  },
  duration: {
    lessThanMinute: '不到 1 分钟',
    minutes: (m) => `${m} 分钟`,
    hours: (h, m) => (m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`),
  },
};

export function messages(lang: unknown): Messages {
  return normLang(lang) === 'zh-CN' ? zhCN : en;
}

/** Coarse remaining time (minute granularity), rounded up. */
export function coarseDuration(t: Messages, ms: number): string {
  if (ms < 60_000) return t.duration.lessThanMinute;
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return t.duration.minutes(totalMin);
  return t.duration.hours(Math.floor(totalMin / 60), totalMin % 60);
}

/** HH:MM:SS countdown (hours may exceed 24). */
export function clockDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}
