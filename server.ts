import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const CACHE_DIR = '/tmp/uhr2-tts-cache';

try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch {
  // Ignore if /tmp not writable
}

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

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    availableVoices: ['Kore', 'Puck', 'Fenrir', 'Charon', 'Zephyr'],
    defaultModel: 'gemini-3.8-flash-lite-tts',
  });
});

// In-memory + /tmp cache to avoid burning API quota on repeated requests
const audioCache = new Map<string, string>();
const timedCache = new Map<string, any>();

function hashKey(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function getCachedAudio(key: string): string | null {
  if (audioCache.has(key)) return audioCache.get(key)!;
  try {
    const filePath = path.join(CACHE_DIR, `clip_${hashKey(key)}.b64`);
    if (fs.existsSync(filePath)) {
      const val = fs.readFileSync(filePath, 'utf8');
      audioCache.set(key, val);
      return val;
    }
  } catch {
    // ignore cache read errors
  }
  return null;
}

function setCachedAudio(key: string, val: string): void {
  audioCache.set(key, val);
  try {
    const filePath = path.join(CACHE_DIR, `clip_${hashKey(key)}.b64`);
    fs.writeFileSync(filePath, val, 'utf8');
  } catch {
    // ignore cache write errors
  }
}

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
  header.writeUInt16LE(1, 20);
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

  const padStartSamples = Math.floor(sampleRate * 0.03);
  const padEndSamples = Math.floor(sampleRate * 0.06);

  const startSample = Math.max(0, firstActive - padStartSamples);
  const endSample = Math.min(totalSamples - 1, lastActive + padEndSamples);

  const trimmed = Buffer.from(pcm.subarray(startSample * 2, (endSample + 1) * 2));

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

/**
 * Splits a single synthesized PCM track containing N pause-separated cues
 * into N individual PCM clips using Dynamic Programming over silent valleys,
 * matching active speech duration of each segment to each cue's word weight.
 * Uses only 1 API call instead of N calls, staying safely within free-tier RPM limits.
 */
function splitPcmIntoCues(
  pcm: Buffer,
  sampleRate: number,
  expectedCount: number,
  wordCounts: number[]
): Buffer[] {
  if (expectedCount <= 1) {
    return [trimPcmSilence(pcm, sampleRate)];
  }

  const totalSamples = Math.floor(pcm.length / 2);
  const frameMs = 20;
  const frameSamples = Math.floor((sampleRate * frameMs) / 1000);
  const totalFrames = Math.floor(totalSamples / frameSamples);

  if (totalFrames < expectedCount * 4) {
    return [trimPcmSilence(pcm, sampleRate)];
  }

  // Compute RMS energy per 20ms frame
  const frameRms: number[] = new Array(totalFrames);
  for (let f = 0; f < totalFrames; f++) {
    let sumSq = 0;
    const startSample = f * frameSamples;
    for (let s = 0; s < frameSamples; s++) {
      const v = pcm.readInt16LE((startSample + s) * 2);
      sumSq += v * v;
    }
    frameRms[f] = Math.sqrt(sumSq / frameSamples);
  }

  const silenceThreshold = 260;
  let firstSpeechFrame = 0;
  let lastSpeechFrame = totalFrames - 1;
  while (firstSpeechFrame < totalFrames && frameRms[firstSpeechFrame] < silenceThreshold) {
    firstSpeechFrame++;
  }
  while (lastSpeechFrame > firstSpeechFrame && frameRms[lastSpeechFrame] < silenceThreshold) {
    lastSpeechFrame--;
  }

  // Prefix sum of active (non-silent) frames for O(1) active-duration lookup
  const activePrefix = new Int32Array(totalFrames + 1);
  for (let f = 0; f < totalFrames; f++) {
    activePrefix[f + 1] = activePrefix[f] + (frameRms[f] >= silenceThreshold ? 1 : 0);
  }
  const totalActiveFrames = Math.max(1, activePrefix[lastSpeechFrame + 1] - activePrefix[firstSpeechFrame]);

  // Detect candidate silent valleys (>= 5 frames = 100ms)
  interface CandidateSplit {
    frame: number;
    valleyBonus: number;
  }

  const candidates: CandidateSplit[] = [{ frame: firstSpeechFrame, valleyBonus: 0 }];
  let inSilence = false;
  let silenceStart = 0;

  for (let f = firstSpeechFrame; f <= lastSpeechFrame; f++) {
    if (frameRms[f] < silenceThreshold) {
      if (!inSilence) {
        inSilence = true;
        silenceStart = f;
      }
    } else if (inSilence) {
      const len = f - silenceStart;
      if (len >= 5) {
        const mid = Math.floor((silenceStart + f - 1) / 2);
        // Longer pauses get stronger bonus (preferred split boundaries)
        const bonus = Math.min(0.6, len * 0.025);
        candidates.push({ frame: mid, valleyBonus: bonus });
      }
      inSilence = false;
    }
  }

  // If very few valleys exist, add local energy minima every ~25 frames as fallback candidates
  if (candidates.length < expectedCount + 2) {
    for (let f = firstSpeechFrame + 15; f < lastSpeechFrame - 15; f += 25) {
      let minF = f;
      let minRms = Infinity;
      for (let k = Math.max(firstSpeechFrame + 5, f - 10); k <= Math.min(lastSpeechFrame - 5, f + 10); k++) {
        if (frameRms[k] < minRms) {
          minRms = frameRms[k];
          minF = k;
        }
      }
      if (!candidates.some((c) => Math.abs(c.frame - minF) < 8)) {
        candidates.push({ frame: minF, valleyBonus: 0 });
      }
    }
    candidates.sort((a, b) => a.frame - b.frame);
  }

  candidates.push({ frame: lastSpeechFrame + 1, valleyBonus: 0 });
  const M = candidates.length;

  // Expected active frames per cue based on word counts (+1.5 word base weight for short phrases)
  const weights = wordCounts.map((w) => Math.max(1, w) + 1.5);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const expectedActive = weights.map((w) => (w / totalWeight) * totalActiveFrames);

  // DP: dp[i][j] = min cost to assign cues 0..i-1 ending at candidate j
  const INF = 1e12;
  const dp: number[][] = Array.from({ length: expectedCount + 1 }, () => new Array(M).fill(INF));
  const parent: number[][] = Array.from({ length: expectedCount + 1 }, () => new Array(M).fill(-1));
  dp[0][0] = 0;

  for (let i = 1; i <= expectedCount; i++) {
    const expAct = expectedActive[i - 1];
    for (let j = i; j < M - (expectedCount - i); j++) {
      const endFrame = candidates[j].frame;
      for (let prev = i - 1; prev < j; prev++) {
        if (dp[i - 1][prev] >= INF) continue;
        const startFrame = candidates[prev].frame;
        const act = activePrefix[endFrame] - activePrefix[startFrame];
        if (act < 4) continue; // At least 80ms of actual speech

        const relErr = (act - expAct) / Math.max(12, expAct);
        const cost = dp[i - 1][prev] + relErr * relErr - candidates[j].valleyBonus;
        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          parent[i][j] = prev;
        }
      }
    }
  }

  // Backtrack optimal boundaries from final candidate (M - 1)
  const chosenIndices = new Array(expectedCount + 1).fill(0);
  chosenIndices[expectedCount] = M - 1;
  for (let i = expectedCount; i >= 1; i--) {
    const p = parent[i][chosenIndices[i]];
    chosenIndices[i - 1] = p >= 0 ? p : Math.max(0, i - 1);
  }

  const segments: Buffer[] = [];
  for (let i = 0; i < expectedCount; i++) {
    const startFrame = i === 0 ? 0 : candidates[chosenIndices[i]].frame;
    const endFrame = i === expectedCount - 1 ? totalFrames : candidates[chosenIndices[i + 1]].frame;
    const startByte = startFrame * frameSamples * 2;
    const endByte = Math.min(pcm.length, endFrame * frameSamples * 2);
    const slice = Buffer.from(pcm.subarray(startByte, Math.max(startByte, endByte)));
    segments.push(trimPcmSilence(slice, sampleRate));
  }

  return segments;
}

function parseApiError(error: any): { status: number; message: string; retryAfterSec?: number } {
  const rawMsg = error?.message || String(error || 'Unknown error');
  let retryAfterSec: number | undefined;

  const retryMatch = rawMsg.match(/retry in\s+([\d.]+)s/i) || rawMsg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (retryMatch) {
    retryAfterSec = Math.ceil(parseFloat(retryMatch[1]));
  }

  if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota')) {
    return {
      status: 429,
      retryAfterSec: retryAfterSec || 30,
      message: `Gemini TTS rate limit reached (Free Tier allows 3 requests/minute). Please wait ${retryAfterSec || 30}s before regenerating.`,
    };
  }

  return {
    status: error?.status || 500,
    message: rawMsg,
  };
}

async function synthesizeClipBase64(
  text: string,
  voiceName: string,
  stylePrompt: string,
  model = 'gemini-3.8-flash-lite-tts'
): Promise<string> {
  const cacheKey = `${model}_${voiceName}_${stylePrompt}_${text.trim()}`;
  const cached = getCachedAudio(cacheKey);
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

  setCachedAudio(cacheKey, base64Audio);
  return base64Audio;
}

// Single TTS Generation Endpoint
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
    const parsedErr = parseApiError(error);
    res.status(parsedErr.status).json({
      error: parsedErr.message,
      retryAfterSec: parsedErr.retryAfterSec,
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

// Timed Multi-Cue Voiceover Stitching Endpoint (Single-Request Batch Synthesis!)
app.post('/api/tts/generate-timed', async (req: Request, res: Response) => {
  try {
    const {
      cues,
      voiceName = 'Kore',
      style,
      accent = 'indian',
      model = 'gemini-3.8-flash-lite-tts',
      tightFlow = false,
    } = req.body as {
      tightFlow?: boolean;
      cues: TimedCueInput[];
      voiceName?: string;
      style?: string;
      accent?: string;
      model?: string;
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

    const timedKey = JSON.stringify({ cues, voiceName, style, accent, model, tightFlow });
    if (timedCache.has(timedKey)) {
      res.json(timedCache.get(timedKey));
      return;
    }

    let baseStyle =
      style ||
      (accent === 'indian'
        ? 'Professional Indian English speaker with an authentic, articulate Indian accent and crisp pronunciation of hardware terms like UHR2, RFID, and LED.'
        : 'Clear, professional product demo narrator with crisp pronunciation of UHR2, RFID, and LED.');

    const speechCues = cues.filter((c) => c.type === 'speech' && c.text && c.text.trim().length > 0);

    // Combine all speech cues into ONE single Gemini TTS call separated by pauses!
    // This reduces API calls from 7 down to 1 so Free Tier (3 RPM) is respected.
    const combinedPrompt = speechCues.map((c) => c.text!.trim()).join('\n\n...\n\n');
    const batchStyle = `${baseStyle} Speak each paragraph clearly with a distinct 1.5 second silent pause between paragraphs.`;

    const rawCombinedB64 = await synthesizeClipBase64(combinedPrompt, voiceName, batchStyle, model);
    const parsed = parseWav(Buffer.from(rawCombinedB64, 'base64'));

    const wordCounts = speechCues.map((c) => c.text!.trim().split(/\s+/).filter(Boolean).length);
    const splitPcms = splitPcmIntoCues(parsed.pcm, parsed.sampleRate, speechCues.length, wordCounts);

    const clipMap = new Map<string, { pcm: Buffer; wavBase64: string }>();
    speechCues.forEach((cue, idx) => {
      const segPcm = splitPcms[idx] || Buffer.alloc(0);
      const segWavB64 = createWavBuffer(segPcm, parsed.sampleRate, parsed.numChannels, parsed.bitsPerSample).toString('base64');
      clipMap.set(cue.id, { pcm: segPcm, wavBase64: segWavB64 });
    });

    // Assemble master timeline at parsed sample rate (24kHz mono 16-bit)
    const sampleRate = parsed.sampleRate || 24000;
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

    let lastSpeechEnd = null as number | null;
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
        const clip = clipMap.get(cue.id);
        if (!clip) continue;
        const clipDurationSec = clip.pcm.length / (sampleRate * 2);
        // Tight flow: each line follows the previous one after a short breath (no dead air).
        // Timed: each line starts at its own timestamp (or just after the previous line if that ran long).
        const actualStart: number = tightFlow
          ? (lastSpeechEnd === null ? cue.startSec : lastSpeechEnd + 0.4)
          : Math.max(cue.startSec, cursorSec > cue.startSec ? cursorSec + 0.08 : cue.startSec);
        const actualEnd: number = actualStart + clipDurationSec;

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
        lastSpeechEnd = actualEnd;
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

    const resultPayload = {
      audioBase64: masterWavBase64,
      mimeType: 'audio/wav',
      totalDurationSec: Number(totalDurationSec.toFixed(3)),
      cueTimings: placements.map(({ pcm: _pcm, ...rest }) => rest),
    };

    timedCache.set(timedKey, resultPayload);
    res.json(resultPayload);
  } catch (error: any) {
    console.error('Timed TTS Generation error:', error);
    const parsedErr = parseApiError(error);
    res.status(parsedErr.status).json({
      error: parsedErr.message,
      retryAfterSec: parsedErr.retryAfterSec,
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
