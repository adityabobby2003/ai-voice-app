import { Mp3Encoder } from '@breezystack/lamejs';

/** Converts a base64 16-bit PCM WAV into an MP3 (192 kbps) and downloads it. */
export function downloadAsMp3(wavBase64: string, filename: string): void {
  const bytes = Uint8Array.from(atob(wavBase64), (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);

  // Read the WAV header (falls back to 24 kHz mono)
  let sampleRate = 24000;
  let channels = 1;
  let dataOffset = 44;
  let dataLen = bytes.length - 44;
  for (let o = 12; o + 8 <= bytes.length; ) {
    const id = String.fromCharCode(...bytes.subarray(o, o + 4));
    const size = view.getUint32(o + 4, true);
    if (id === 'fmt ') {
      channels = view.getUint16(o + 10, true);
      sampleRate = view.getUint32(o + 12, true);
    } else if (id === 'data') {
      dataOffset = o + 8;
      dataLen = Math.min(size, bytes.length - dataOffset);
      break;
    }
    o += 8 + size + (size % 2);
  }

  const samples = new Int16Array(bytes.buffer.slice(dataOffset, dataOffset + (dataLen & ~1)));
  const mono =
    channels === 1 ? samples : samples.filter((_, i) => i % channels === 0); // keep first channel

  const encoder = new Mp3Encoder(1, sampleRate, 192);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < mono.length; i += 1152) {
    const out = encoder.encodeBuffer(mono.subarray(i, i + 1152));
    if (out.length) chunks.push(new Uint8Array(out));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(new Uint8Array(end));

  const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'audio/mpeg' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/\.wav$/i, '.mp3');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
