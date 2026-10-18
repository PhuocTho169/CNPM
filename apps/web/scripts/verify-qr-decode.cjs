// Decode the QR images the server actually serves, and prove each one points at
// a URL that loads.
//
// The phone camera is the real consumer here, so "the row says X" is not proof
// — the pixels have to encode X, and X has to answer. This fetches each PNG over
// HTTP, decodes it with the same jsQR library the web scanner uses, and then
// requests whatever was decoded.
//
// Usage: node scripts/verify-qr-decode.js
const jsQR = require('jsqr');

const BASE = process.env.QR_BASE || 'http://192.168.1.53:8080';
const API = process.env.API_BASE || 'http://192.168.1.53:5001/api';

// --- minimal PNG -> RGBA (no image libs on the server) ---
const zlib = require('zlib');

function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    offset += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8ClampedArray(width * height * 4);

  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      out[d] = line[s];
      out[d + 1] = channels >= 3 ? line[s + 1] : line[s];
      out[d + 2] = channels >= 3 ? line[s + 2] : line[s];
      out[d + 3] = channels >= 2 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

(async () => {
  let failed = 0;
  const check = (ok, label, detail) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}`);
    if (!ok) failed++;
  };

  console.log(`QR images from ${BASE}\n`);

  for (const id of [1, 3, 6, 9, 10]) {
    const res = await fetch(`${API}/places/${id}/qr`);
    const data = (await res.json()).data;
    if (!data) {
      check(false, `place ${id}`, 'no QR row');
      continue;
    }

    const png = Buffer.from(await (await fetch(`${BASE}${data.image_url}`)).arrayBuffer());
    const { width, height, data: pixels } = decodePng(png);
    const decoded = jsQR(pixels, width, height);
    const text = decoded && decoded.data;

    check(!!text, `place ${id} QR decodes`, text ? `-> ${text}` : '(jsQR could not read it)');
    if (!text) continue;

    check(text === data.qr_value, `place ${id} pixels match stored URL`, `${text} vs ${data.qr_value}`);

    // The part that actually matters: can a phone reach it?
    const page = await fetch(text);
    const html = await page.text();
    check(
      page.status === 200 && html.includes('<div id="root">'),
      `place ${id} target serves the app`,
      `HTTP ${page.status}, SPA shell ${html.includes('<div id="root">') ? 'present' : 'MISSING'}`
    );
  }

  console.log(failed ? `\n${failed} check(s) FAILED.` : '\nEvery QR decodes and every target loads.');
  process.exitCode = failed ? 1 : 0;
})();