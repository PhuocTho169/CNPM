// Minimal MPEG audio frame parser — enough to report a real duration for an
// mp3 without pulling ffmpeg into the image.
//
// Lives in src/ (not in scripts/) because both sides need it: the TTS
// providers report no duration, so attachAudio() measures the file it just
// wrote; the scripts (backfill + diagnostics) share the exact same logic.

const fs = require('fs');
const path = require('path');
const config = require('../config');

const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0], // MPEG1 L3
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],   // MPEG2/2.5 L3
};

const RATES = {
  3: [44100, 48000, 32000, 0], // MPEG1
  2: [22050, 24000, 16000, 0], // MPEG2
  0: [11025, 12000, 8000, 0],  // MPEG2.5
};

function findFrameHeader(buf, from = 0) {
  for (let i = from; i < buf.length - 4; i++) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) continue;
    // Layer bits live at 0b01 of byte 1; reject the reserved 00 pattern.
    if ((buf[i + 1] & 0x06) === 0x00) continue;
    return i;
  }
  return -1;
}

function parseMpeg(buf) {
  const i = findFrameHeader(buf);
  if (i < 0) return null;
  const b1 = buf[i + 1];
  const b2 = buf[i + 2];
  const b3 = buf[i + 3];
  const versionBits = (b1 >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
  const layerBits = (b1 >> 1) & 0x03;   // 1 = Layer III
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const rateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;
  const channelMode = (b3 >> 6) & 0x03;

  if (layerBits !== 1) return null;
  const table = versionBits === 3 ? BITRATES[1] : BITRATES[2];
  const rateTable = RATES[versionBits];
  if (!rateTable) return null;

  const bitrate = table[bitrateIndex] * 1000;
  const sampleRate = rateTable[rateIndex];
  if (!bitrate || !sampleRate) return null;

  // MPEG2/2.5 use 576 samples per frame, MPEG1 uses 1152.
  const samplesPerFrame = versionBits === 3 ? 1152 : 576;
  const bytesPerFrame = Math.floor((samplesPerFrame / 8) * bitrate / sampleRate) + padding;
  if (bytesPerFrame <= 0) return null;
  const frameCount = Math.floor((buf.length - i) / bytesPerFrame);
  const durationSec = frameCount > 0 ? (frameCount * samplesPerFrame) / sampleRate : 0;
  return {
    bitrate,
    sampleRate,
    version: versionBits === 3 ? 'MPEG1' : versionBits === 2 ? 'MPEG2' : 'MPEG2.5',
    mono: channelMode === 3,
    frameCount,
    durationSec,
    bytesPerFrame,
  };
}

/**
 * Turn a stored audio URL (`/uploads/audio/x.mp3` or a full
 * http(s) URL) into an absolute path inside the uploads folder.
 * Returns null for anything we did not write ourselves.
 */
function localAudioPath(fileUrl) {
  if (!fileUrl) return null;
  const m = String(fileUrl).match(/\/uploads\/(.+)$/);
  if (!m) return null;
  return path.join(config.uploadDir, m[1]);
}

/**
 * Duration in whole seconds for a stored audio URL, or null when the file is
 * missing or not a parseable mp3. Never throws: a missing duration must not
 * be able to fail an audio upload.
 */
function measureAudioDuration(fileUrl) {
  const abs = localAudioPath(fileUrl);
  if (!abs) return null;
  try {
    if (!fs.existsSync(abs)) return null;
    const info = parseMpeg(fs.readFileSync(abs));
    return info && info.durationSec > 0 ? Math.round(info.durationSec) : null;
  } catch {
    return null;
  }
}

module.exports = { findFrameHeader, parseMpeg, localAudioPath, measureAudioDuration };