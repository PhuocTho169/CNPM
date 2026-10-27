import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

// BCP-47 locale for the browser fallback — read from the language registry
// (`languages.bcl`), exactly like AudioPlayer, so a newly added language gets a
// native voice here too. With no bcl we speak the code and let the browser
// match the primary subtag.
function localeFor(code, languages) {
  if (!code) return 'vi';
  const bcl = (languages || []).find((l) => l.code === code)?.bcl;
  const locale = String(bcl || code).trim().toLowerCase();
  return locale || 'vi';
}

/**
 * Play button for one dish.
 *
 * Each dish narrates a single short text, so it does not need the full
 * AudioPlayer with its seek bar and speed control. When a generated file exists
 * it is used; otherwise we fall back to the browser voice, which is what kept
 * non-Vietnamese dishes silent before per-dish audio existed.
 */
export default function DishAudioButton({ audioUrl, pending, label, narrationText }) {
  const { lang, languages, t } = useApp();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  // The DB may point at a file the server cannot serve anymore (404 after a
  // rebuild). The play promise then never resolves and the button looked
  // dead — treat the file as broken and speak with the browser voice instead.
  const [fileBroken, setFileBroken] = useState(false);
  const effectiveAudioUrl = fileBroken ? null : audioUrl;

  // Switching dishes/language must not leave the previous clip running.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.load();
    setPlaying(false);
    setFileBroken(false); // the new file may be fine even if the last one 404'd
  }, [audioUrl]);

  useEffect(() => () => window.speechSynthesis?.cancel(), [audioUrl]);

  const speakWithBrowser = () => {
    const text = narrationText || label || '';
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = localeFor(lang, languages);
    utter.onend = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utter);
    setPlaying(true);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (el && effectiveAudioUrl) {
      if (!el.paused) {
        el.pause();
        setPlaying(false);
      } else {
        el.play().then(() => setPlaying(true)).catch(() => {
          setFileBroken(true); // decode/load failure → browser voice keeps the button alive
          speakWithBrowser();
        });
      }
      return;
    }
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setPlaying(false);
    } else {
      speakWithBrowser();
    }
  };

  return (
    <button
      type="button"
      className="ctrl-btn"
      onClick={toggle}
      aria-label={playing ? t('pause') : t('listenDish')}
      title={pending ? t('creatingTitle') : undefined}
    >
      {playing ? '❚❚' : '🔊'} {pending ? t('creating') : t('listenDish')}
      {!effectiveAudioUrl && window.speechSynthesis && (
        <span style={{ marginLeft: 6, fontSize: '0.78rem', color: 'var(--text-2)' }}>
          ({t('voiceNotAvailableForLang')})
        </span>
      )}
      {effectiveAudioUrl && (
        <audio
          key={effectiveAudioUrl}
          ref={audioRef}
          src={effectiveAudioUrl}
          preload="none"
          onError={() => setFileBroken(true)}
        />
      )}
    </button>
  );
}