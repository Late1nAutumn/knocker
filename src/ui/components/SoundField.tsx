import { useT } from '../api.js';
import { CloseIcon, FolderIcon, MuteIcon, PlayIcon, SpeakerIcon, StopIcon } from './Icons.js';

export interface SoundFieldProps {
  path: string;
  previewing: boolean;
  disabled: boolean;
  onChoose(): void;
  onClear(): void;
  onTogglePreview(): void;
}

function baseName(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

/** The reminder sound: a local file chosen by the user, or none (silent). */
export function SoundField({ path, previewing, disabled, onChoose, onClear, onTogglePreview }: SoundFieldProps) {
  const t = useT();
  return (
    <div className="kn-field">
      <span className="kn-field-label">{t.settings.audio}</span>
      <div className="kn-field-body">
        {path ? (
          <div className="kn-file">
            <SpeakerIcon size={18} className="kn-file-icon" />
            <div className="kn-file-text">
              <span className="kn-file-name">{baseName(path)}</span>
              <span className="kn-file-path" title={path}>
                {path}
              </span>
            </div>
          </div>
        ) : (
          <div className="kn-file kn-file-empty">
            <MuteIcon size={18} className="kn-file-icon" />
            <span>{t.settings.audioNone}</span>
          </div>
        )}
        <div className="kn-row">
          <button type="button" className="kn-btn" disabled={disabled} onClick={onChoose}>
            <FolderIcon size={14} />
            {t.settings.audioChoose}
          </button>
          {path && (
            <>
              <button type="button" className="kn-btn" disabled={disabled && !previewing} onClick={onTogglePreview}>
                {previewing ? <StopIcon size={12} /> : <PlayIcon size={12} />}
                {previewing ? t.settings.audioStopPreview : t.settings.audioPreview}
              </button>
              <button type="button" className="kn-btn kn-btn-quiet" disabled={disabled} onClick={onClear}>
                <CloseIcon size={13} />
                {t.settings.audioClear}
              </button>
            </>
          )}
        </div>
        <p className="kn-hint">{t.settings.audioFormats}</p>
      </div>
    </div>
  );
}
