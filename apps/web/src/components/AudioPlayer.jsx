import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

const SPEEDS = [0.75, 1, 1.25, 1.5];

// BCP-47 locale for the browser voice. It comes from the language registry
// (`languages.bcl`, e.g. "fr-FR") so a language an admin adds narrates with a
// native voice without any code change; without one we fall back to the code
// itself, which pickVoice() still matches against the primary subtag
// (vi → the installed vi-VN voice).
function localeFor(code, languages) {
  if (!code) return 'vi';
  const bcl = (languages || []).find((l) => l.code === code)?.bcl;
  const locale = String(bcl || code).trim().toLowerCase();
  return locale || 'vi';
}

function normalizeVoiceLang(v) {
  return String(v?.lang || '').replace('_', '-').toLowerCase();
}

// Pick the installed browser voice that best matches the narration language.
function pickVoice(locale) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const want = locale.toLowerCase();
  const primary = want.split('-')[0];
  return (
    voices.find((v) => normalizeVoiceLang(v) === want) ||           // exact locale, e.g. vi-VN
    voices.find((v) => normalizeVoiceLang(v).startsWith(primary + '-')) || // same language
    voices.find((v) => normalizeVoiceLang(v) === primary) ||
    null
  );
}

function fmt(sec) {
  if (!sec || !isFinite(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ audioUrl, duration, narrationText, placeName, audioPending }) {
  const { lang, languages, t } = useApp();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [browserSpeaking, setBrowserSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  // The DB can reference an MP3 that is no longer on disk (404) or that the
  // browser cannot decode. Without this flag the play button silently does
  // nothing — the guide sounded "dead" for exactly these languages. A broken
  // file falls back to the browser voice, so the narration is ALWAYS audible.
  const [fileBroken, setFileBroken] = useState(false);

  // Mark the file unusable when the browser fails to load or decode it.
  const onFileError = () => {
    setFileBroken(true);
    setPlaying(false);
    setCurrent(0);
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setTotal(el.duration || duration || 0);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, [audioUrl, duration]);

  // React reuses the same <audio> element when the language changes, and changing
  // `src` alone does NOT interrupt what is loaded or playing. Switching language
  // therefore kept replaying the previous language's file — it looked like only
  // two voices existed. load() forces a re-fetch of the new src.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    el.pause();
    el.load();
    setPlaying(false);
    setCurrent(0);
    setTotal(duration || 0);
    setFileBroken(false); // the new file may work even if the previous one didn't
  }, [audioUrl, duration]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  // Stop browser TTS when unmounting, when the language changes, or when a real audio file appears
  useEffect(() => () => window.speechSynthesis?.cancel(), [audioUrl, lang]);

  // Auto-play the next translation chunk when the current audio finishes.
  // `audioUrl` is the unique key per file, so switching language always starts
  // a fresh clip. If the same `audioUrl` continues (chunked TTS), the `ended`
  // listener below keeps playing the next chunk.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
  }, [audioUrl]);

  // Browser loads the voice list asynchronously
  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const update = () => setVoicesReady(window.speechSynthesis.getVoices().length > 0);
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);

  // Keep the audio element's volume/speed in sync with the controls.
  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.volume = volume;
      el.playbackRate = speed;
    }
  }, [volume, speed]);

  const locale = localeFor(lang, languages);
  const matchedVoice = pickVoice(locale);

  // Only trust the file until the browser proves it unreadable.
  const hasFileAudio = !!audioUrl && !fileBroken;
  const useBrowserVoice = !hasFileAudio && !!(narrationText || placeName);

  const toggle = () => {
    // A file the browser cannot load (gone from disk, 404, decode error) must
    // never leave the guest in silence: fall back to the browser voice instead.
    const el = audioRef.current;
    if (hasFileAudio && el) {
      if (playing) el.pause();
      else
        el.play().catch(() => {
          setFileBroken(true);
          setPlaying(false);
          toggleBrowserNarration();
        });
      setPlaying(!playing);
      return;
    }
    toggleBrowserNarration();
  };

  // When the native TTS (or a generated file) ends, just stop playing but keep
  // the player ready. The parent re-renders with a new `audioUrl` when the
  // language changes, which forces the `load()` effect above to pick up the
  // correct file.
  const onEnded = () => {
    setPlaying(false);
    setCurrent(0);
  };

  const seekBy = (delta) => {
    const el = audioRef.current;
    if (el) el.currentTime = Math.max(0, Math.min((el.duration || 0) - 0.5, el.currentTime + delta));
  };

  const toggleBrowserNarration = () => {
    if (!window.speechSynthesis) return;
    if (browserSpeaking) {
      window.speechSynthesis.cancel();
      setBrowserSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel(); // clear anything stuck in the queue

    const locale = localeFor(lang, languages);
    const speak = () => {
      const utter = new SpeechSynthesisUtterance(narrationText || placeName || '');
      utter.lang = locale;
      const voice = pickVoice(locale);
      if (voice) {
        utter.voice = voice; // native speaker voice for this language, if available
        utter.lang = voice.lang;
      }
      utter.rate = speed;
      utter.onend = () => setBrowserSpeaking(false);
      utter.onerror = () => setBrowserSpeaking(false);
      window.speechSynthesis.speak(utter);
      setBrowserSpeaking(true);
    };

    // Chrome loads the voice list asynchronously — if it is not ready yet,
    // wait briefly for `voiceschanged` before speaking, otherwise speak anyway.
    if (window.speechSynthesis.getVoices().length > 0) {
      speak();
    } else {
      const onVoices = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        if (!window.speechSynthesis.speaking) speak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) speak();
      }, 1200);
    }
  };

  return (
    <div className="audio-player" role="region" aria-label="Audio guide player">
      <div className="audio-player-top">
        <button
          className="play-btn"
          onClick={hasFileAudio ? toggle : toggleBrowserNarration}
          disabled={!hasFileAudio && !useBrowserVoice}
          aria-label={playing || browserSpeaking ? t('pause') : t('play')}
        >
          {playing || browserSpeaking ? '❚❚' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '0.95rem' }}>{t('listenGuide')}</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
            {hasFileAudio
              ? (browserSpeaking ? '' : playing ? '▶ ' + t('play') + '…' : '')
              : browserSpeaking
                ? '🔊 …'
                : t('noAudioFile')}
          </div>
        </div>
      </div>

      {hasFileAudio ? (
        <>
          <input
            className="seekbar"
            type="range"
            min="0"
            max={total || 100}
            step="0.1"
            value={current}
            onChange={(e) => { const el = audioRef.current; if (el) el.currentTime = Number(e.target.value); }}
            aria-label="Seek"
          />
          <div className="audio-times"><span>{fmt(current)}</span><span>{fmt(total)}</span></div>
          <div className="audio-controls">
            <button className="ctrl-btn" onClick={() => seekBy(-10)}>⏪ 10s</button>
            <button className="ctrl-btn" onClick={() => seekBy(10)}>10s ⏩</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>🔊</label>
              <input type="range" min="0" max="1" step="0.05" value={volume}
                onChange={(e) => setVolume(Number(e.target.value))} style={{ width: 64 }} aria-label="Volume" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>❄️</label>
              <select className="ctrl-btn" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Speed" style={{ padding: '0.2rem 0.5rem' }}>
                {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
              </select>
            </div>
          </div>
          {/* key={audioUrl} forces a brand-new <audio> per file, so switching
              language can never keep the previously loaded audio.
              A load/decode failure (e.g. the file no longer exists on the
              server) flips to the browser voice instead of dying silently. */}
          <audio key={audioUrl} ref={audioRef} src={audioUrl} preload="metadata" onError={onFileError} />
        </>
      ) : (
        narrationText && (
          <>
            <p className="no-audio-note" style={{ marginTop: '0.7rem' }}>
              {narrationText.slice(0, 140)}…
            </p>
            {voicesReady && (
              <p className="no-audio-note" style={{ fontSize: '0.78rem' }}>
                {matchedVoice
                  ? `🎙 ${locale} — ${matchedVoice.name}`
                  : `⚠️ ${locale} — ${t('deviceHasNoVoiceInstalled', { locale })}`}
              </p>
            )}
            {audioPending && !browserSpeaking && (
              <p className="no-audio-note" style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>
                ⏳ {t('audioPendingNote', { locale })}
              </p>
            )}
          </>
        )
      )}
    </div>
  );
}
