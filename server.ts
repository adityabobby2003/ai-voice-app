import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const app = express();
app.use(express.json({ limit: '15mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    availableVoices: ['Kore', 'Puck', 'Fenrir', 'Charon', 'Zephyr'],
    defaultModel: 'gemini-3.8-flash-lite-tts',
  });
});

// Audio cache to prevent repeated requests for the same text, voice, and style
const audioCache = new Map<string, string>();

function getGenAIClient(): GoogleGenAI {
  if (ai) return ai;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ParsedWav {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  pcm: Buffer;
}

function parseWav(wavBuffer: Buffer): ParsedWav {
  if (wavBuffer.length < 44 || wavBuffer.toString('ascii', 0, 4) !== 'RIFF') {
    return {
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
      pcm: wavBuffer.length > 44 ? wavBuffer.subarray(44) : wavBuffer,
    };
  }

  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let offset = 12;
  let pcm = wavBuffer.subarray(44);

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;

    if (chunkId === 'fmt ' && chunkSize >= 16 && dataStart + 16 <= wavBuffer.length) {
      numChannels = wavBuffer.readUInt16LE(dataStart + 2);
      sampleRate = wavBuffer.readUInt32LE(dataStart + 4);
      bitsPerSample = wavBuffer.readUInt16LE(dataStart + 14);
    } else if (chunkId === 'data') {
      const dataEnd = Math.min(wavBuffer.length, dataStart + chunkSize);
      pcm = wavBuffer.subarray(dataStart, dataEnd);
      break;
    }

    offset = dataStart + chunkSize + (chunkSize % 2);
  }

  return { sampleRate, numChannels, bitsPerSample, pcm };
}

function createWavBuffer(pcm: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

function trimPcmSilence(pcm: Buffer, sampleRate: number, threshold = 180): Buffer {
  const totalSamples = Math.floor(pcm.length / 2);
  if (totalSamples === 0) return pcm;

  let firstActive = 0;
  let lastActive = totalSamples - 1;

  for (let i = 0; i < totalSamples; i++) {
    if (Math.abs(pcm.readInt16LE(i * 2)) > threshold) {
      firstActive = i;
      break;
    }
  }

  for (let i = totalSamples - 1; i >= firstActive; i--) {
    if (Math.abs(pcm.readInt16LE(i * 2)) > threshold) {
      lastActive = i;
      break;
    }
  }

  // Keep 30ms lead-in and 60ms tail padding for natural breath
  const padStartSamples = Math.floor(sampleRate * 0.03);
  const padEndSamples = Math.floor(sampleRate * 0.06);

  const startSample = Math.max(0, firstActive - padStartSamples);
  const endSample = Math.min(totalSamples - 1, lastActive + padEndSamples);

  const trimmed = Buffer.from(pcm.subarray(startSample * 2, (endSample + 1) * 2));

  // Gentle 8ms fade-in/out to prevent clicks
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.008), Math.floor(trimmed.length / 4));
  for (let i = 0; i < fadeSamples; i++) {
    const gain = i / fadeSamples;
    const sStart = trimmed.readInt16LE(i * 2);
    trimmed.writeInt16LE(Math.round(sStart * gain), i * 2);

    const endIdx = trimmed.length / 2 - 1 - i;
    const sEnd = trimmed.readInt16LE(endIdx * 2);
    trimmed.writeInt16LE(Math.round(sEnd * gain), endIdx * 2);
  }

  return trimmed;
}

async function synthesizeClipBase64(
  text: string,
  voiceName: string,
  stylePrompt: string,
  model = 'gemini-3.8-flash-lite-tts'
): Promise<string> {
  const cacheKey = `${model}_${voiceName}_${stylePrompt}_${text.trim()}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const client = getGenAIClient();
  const targetModel = model === 'gemini-3.8-flash-tts' ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts';

  const response = await client.models.generateContent({
    model: targetModel,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text.trim(),
            speechMetadata: {
              style: stylePrompt,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error(`No audio data received from Gemini TTS (${response.candidates?.[0]?.finishReason || 'unknown'})`);
  }

  audioCache.set(cacheKey, base64Audio);
  return base64Audio;
}

// Single TTS Generation Endpoint using Gemini 3.8 Flash-Lite TTS
app.post('/api/tts/generate', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', style, accent = 'indian', model = 'gemini-3.8-flash-lite-tts' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Text prompt is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
      return;
    }

    let defaultStylePrompt = 'Clear, professional product demonstrator with natural pauses and precise pronunciation of technical terms like RFID, dBm, EPC, and UHR2';
    if (accent === 'indian') {
      defaultStylePrompt = 'Professional Indian English speaker with an authentic, articulate Indian accent, natural cadence, clear pauses, and crisp pronunciation of technical hardware terms like UHR2, RFID, EPC, and dBm.';
    }

    const stylePrompt = style || defaultStylePrompt;
    const base64Audio = await synthesizeClipBase64(text, voiceName, stylePrompt, model);

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      cached: true,
    });
  } catch (error: any) {
    console.error('TTS Generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate speech with Gemini TTS',
    });
  }
});

interface TimedCueInput {
  id: string;
  type: 'speech' | 'silence';
  startSec: number;
  endSec: number;
  text?: string;
}

// Timed Multi-Cue Voiceover Stitching Endpoint for Video Synchronization
app.post('/api/tts/generate-timed', async (req: Request, res: Response) => {
  try {
    const {
      cues,
      voiceName = 'Kore',
      style,
      accent = 'indian',
      model = 'gemini-3.8-flash-lite-tts',
      trimSilence = true,
    } = req.body as {
      cues: TimedCueInput[];
      voiceName?: string;
      style?: string;
      accent?: string;
      model?: string;
      trimSilence?: boolean;
    };

    if (!Array.isArray(cues) || cues.length === 0) {
      res.status(400).json({ error: 'cues array is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
      return;
    }

    let baseStyle =
      style ||
      (accent === 'indian'
        ? 'Professional Indian English speaker with an authentic, articulate Indian accent and crisp pronunciation of hardware terms like UHR2, RFID, and LED.'
        : 'Clear, professional product demo narrator with crisp pronunciation of UHR2, RFID, and LED.');

    // Generate each speech cue with bounded concurrency (3 at a time)
    const speechCues = cues.filter((c) => c.type === 'speech' && c.text && c.text.trim().length > 0);
    const clipResults = new Map<string, { pcm: Buffer; wavBase64: string; sampleRate: number }>();

    const concurrency = 3;
    for (let i = 0; i < speechCues.length; i += concurrency) {
      const batch = speechCues.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (cue) => {
          const slotSec = Math.max(0.8, cue.endSec - cue.startSec);
          const pacingHint =
            slotSec <= 1.5
              ? 'Deliver briskly and cleanly within 1 second.'
              : slotSec <= 3.5
              ? `Deliver concisely within ${slotSec} seconds.`
              : `Deliver naturally and clearly, fitting comfortably within ${slotSec} seconds.`;

          const cueStyle = `${baseStyle} ${pacingHint}`;
          const rawB64 = await synthesizeClipBase64(cue.text!, voiceName, cueStyle, model);
          const parsed = parseWav(Buffer.from(rawB64, 'base64'));
          const processedPcm = trimSilence ? trimPcmSilence(parsed.pcm, parsed.sampleRate) : parsed.pcm;
          const processedWavB64 = createWavBuffer(processedPcm, parsed.sampleRate, parsed.numChannels, parsed.bitsPerSample).toString('base64');

          clipResults.set(cue.id, {
            pcm: processedPcm,
            wavBase64: processedWavB64,
            sampleRate: parsed.sampleRate,
          });
        })
      );
    }

    // Assemble master timeline at 24kHz mono 16-bit
    const sampleRate = 24000;
    let cursorSec = 0;
    const placements: Array<{
      id: string;
      type: 'speech' | 'silence';
      targetStartSec: number;
      targetEndSec: number;
      actualStartSec: number;
      actualEndSec: number;
      actualDurationSec: number;
      pcm?: Buffer;
      wavBase64?: string;
    }> = [];

    for (const cue of cues) {
      if (cue.type === 'silence' || !cue.text?.trim()) {
        const start = Math.max(cursorSec, cue.startSec);
        const end = Math.max(start, cue.endSec);
        placements.push({
          id: cue.id,
          type: 'silence',
          targetStartSec: cue.startSec,
          targetEndSec: cue.endSec,
          actualStartSec: start,
          actualEndSec: end,
          actualDurationSec: end - start,
        });
        cursorSec = end;
      } else {
        const clip = clipResults.get(cue.id);
        if (!clip) continue;
        const clipDurationSec = clip.pcm.length / (sampleRate * 2);
        // Start at target startSec, or right after previous speech + 80ms gap if previous slightly ran over
        const actualStart = Math.max(cue.startSec, cursorSec > cue.startSec ? cursorSec + 0.08 : cue.startSec);
        const actualEnd = actualStart + clipDurationSec;

        placements.push({
          id: cue.id,
          type: 'speech',
          targetStartSec: cue.startSec,
          targetEndSec: cue.endSec,
          actualStartSec: Number(actualStart.toFixed(3)),
          actualEndSec: Number(actualEnd.toFixed(3)),
          actualDurationSec: Number(clipDurationSec.toFixed(3)),
          pcm: clip.pcm,
          wavBase64: clip.wavBase64,
        });

        cursorSec = Math.max(actualEnd, cue.endSec);
      }
    }

    const maxTargetEnd = cues.reduce((max, c) => Math.max(max, c.endSec), 0);
    const totalDurationSec = Math.max(maxTargetEnd, cursorSec + 0.25);
    const totalBytes = Math.ceil(totalDurationSec * sampleRate) * 2;
    const masterPcm = Buffer.alloc(totalBytes, 0);

    for (const p of placements) {
      if (p.type === 'speech' && p.pcm) {
        const byteOffset = Math.floor(p.actualStartSec * sampleRate) * 2;
        if (byteOffset + p.pcm.length <= masterPcm.length) {
          p.pcm.copy(masterPcm, byteOffset);
        }
      }
    }

    const masterWavBase64 = createWavBuffer(masterPcm, sampleRate, 1, 16).toString('base64');

    res.json({
      audioBase64: masterWavBase64,
      mimeType: 'audio/wav',
      totalDurationSec: Number(totalDurationSec.toFixed(3)),
      cueTimings: placements.map(({ pcm: _pcm, ...rest }) => rest),
    });
  } catch (error: any) {
    console.error('Timed TTS Generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate timed speech',
    });
  }
});

// Vite middleware or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTS Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
