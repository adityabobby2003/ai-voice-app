import { downloadAsMp3 } from './utils/mp3';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Play,
  Download,
  FileEdit,
  Radio,
  Sparkles,
  AlertCircle,
  Layers,
  Smartphone,
  Clock,
  Film,
  CheckCircle2,
} from 'lucide-react';
import {
  FULL_DEFAULT_SCRIPT,
  HINDI_DEFAULT_SCRIPT,
  LED_DEMO_CUES,
  DEFAULT_TIMED_SCRIPT,
  cuesToScript,
  scriptToCues,
  SCRIPT_SEGMENTS,
  ScriptSegment,
  TimedCue,
  INDIAN_VOICES,
  ACCENT_PRESETS,
  STYLE_PRESETS,
  VoiceOption,
} from './data/scriptData';
import { DeviceSimulator } from './components/DeviceSimulator';
import { AudioWaveform } from './components/AudioWaveform';
import { SegmentList } from './components/SegmentList';
import { TimedTimeline, CueTimingResult } from './components/TimedTimeline';
import { VoiceSelector } from './components/VoiceSelector';
import { ExportModal } from './components/ExportModal';
import { ScriptModal } from './components/ScriptModal';

type ProjectMode = 'led-video-demo' | 'full-walkthrough';

export default function App() {
  // Project switcher: default to the user's new Timed LED Tag & Settings Video Demo
  const [projectMode, setProjectMode] = useState<ProjectMode>('led-video-demo');

  // Voice & Accent state
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(INDIAN_VOICES[0]);
  const [selectedAccent, setSelectedAccent] = useState<string>('indian-english');
  const [selectedStyle, setSelectedStyle] = useState<string>('product-demo');
  const [languageMode, setLanguageMode] = useState<'en' | 'hi'>('en');

  // Script & Cues state
  const [tightFlow, setTightFlow] = useState<boolean>(true);
  const [timedCues, setTimedCues] = useState<TimedCue[]>(() => scriptToCues(DEFAULT_TIMED_SCRIPT));
  const [scriptText, setScriptText] = useState<string>(FULL_DEFAULT_SCRIPT);
  const [segments] = useState<ScriptSegment[]>(SCRIPT_SEGMENTS);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.9);

  // Active scene tracking
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [activeSegmentAudioIndex, setActiveSegmentAudioIndex] = useState<number | null>(null);
  const [activeCueIndex, setActiveCueIndex] = useState<number>(0);
  const [activeSingleCueId, setActiveSingleCueId] = useState<string | null>(null);

  // AI TTS Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingSegmentId, setGeneratingSegmentId] = useState<string | null>(null);
  const [generatingCueId, setGeneratingCueId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [fullAudioBase64, setFullAudioBase64] = useState<string | null>(null);
  const [segmentAudioMap, setSegmentAudioMap] = useState<Record<string, string>>({});
  const [cueTimingsMap, setCueTimingsMap] = useState<Record<string, CueTimingResult>>({});
  const isRequestInFlightRef = useRef<boolean>(false);

  // Modals & tabs
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'voice' | 'teleprompter'>('visualizer');

  // Audio and Web Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Build the complete style instruction for Gemini TTS
  const getFullStyleInstruction = () => {
    const accentObj = ACCENT_PRESETS.find((a) => a.id === selectedAccent);
    const styleObj = STYLE_PRESETS.find((s) => s.id === selectedStyle);

    let instruction = selectedVoice.stylePrompt;
    if (accentObj) {
      instruction += ` Speak ${accentObj.promptModifier}.`;
    }
    if (styleObj) {
      instruction += ` Pacing and tone: ${styleObj.prompt}.`;
    }
    if (languageMode === 'hi' && projectMode === 'full-walkthrough') {
      instruction += ` Speak fluent, natural Hindi with clear English loanwords for hardware terms like UHR2, RFID, dBm, and Android 13.`;
    }
    return instruction;
  };

  // Initialize Audio Element & Web Audio graph
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);

        if (projectMode === 'led-video-demo' && activeSingleCueId === null) {
          const t = audio.currentTime;
          const idx = timedCues.findIndex((cue) => {
            const timing = cueTimingsMap[cue.id];
            const start = timing ? timing.actualStartSec : cue.startSec;
            const end = timing ? timing.actualEndSec : cue.endSec;
            return t >= start && t < end;
          });
          if (idx >= 0) {
            setActiveCueIndex(idx);
          } else if (timedCues.length > 0 && t >= timedCues[timedCues.length - 1].startSec) {
            setActiveCueIndex(timedCues.length - 1);
          }
        } else if (projectMode === 'full-walkthrough' && activeSegmentAudioIndex === null && segments.length > 0) {
          const ratio = audio.currentTime / audio.duration;
          const segIdx = Math.min(segments.length - 1, Math.floor(ratio * segments.length));
          setCurrentSegmentIndex(segIdx);
        }
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveSegmentAudioIndex(null);
      setActiveSingleCueId(null);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [projectMode, segments, timedCues, cueTimingsMap, activeSegmentAudioIndex, activeSingleCueId]);

  const ensureAudioContext = () => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;

        if (audioRef.current && !sourceNodeRef.current) {
          try {
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            sourceNodeRef.current = source;
          } catch (e) {
            console.warn('MediaElementSource already connected or blocked:', e);
          }
        }

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Cooldown countdown timer for 429 rate-limit recovery
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          setGenerationError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  // Generate Timed Multi-Cue Master WAV for LED Video Demo
  const handleGenerateTimedDemo = async (
    voiceOverride?: VoiceOption,
    accentOverride?: string,
    styleOverride?: string,
    cuesOverride?: TimedCue[]
  ) => {
    if (isRequestInFlightRef.current || cooldownSec > 0) return;

    const activeVoice = voiceOverride || selectedVoice;
    const activeAccent = accentOverride || selectedAccent;
    const activeStyle = styleOverride || selectedStyle;
    const cuesToUse = cuesOverride || timedCues;

    try {
      isRequestInFlightRef.current = true;
      setIsGenerating(true);
      setGenerationError(null);

      const accentObj = ACCENT_PRESETS.find((a) => a.id === activeAccent);
      const styleObj = STYLE_PRESETS.find((s) => s.id === activeStyle);
      let instruction = activeVoice.stylePrompt;
      if (accentObj) instruction += ` Speak ${accentObj.promptModifier}.`;
      if (styleObj) instruction += ` Pacing and tone: ${styleObj.prompt}.`;

      const response = await fetch('/api/tts/generate-timed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cues: cuesToUse.map((c) => ({
            id: c.id,
            type: c.type,
            startSec: c.startSec,
            endSec: c.endSec,
            text: c.text,
          })),
          voiceName: activeVoice.baseVoice,
          style: instruction,
          accent: activeVoice.accent.toLowerCase(),
          tightFlow,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setCooldownSec(errorData.retryAfterSec || 30);
        }
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('No audio data received from server');
      }

      setFullAudioBase64(data.audioBase64);

      const timingMap: Record<string, CueTimingResult> = {};
      if (Array.isArray(data.cueTimings)) {
        for (const item of data.cueTimings as CueTimingResult[]) {
          timingMap[item.id] = item;
        }
      }
      setCueTimingsMap(timingMap);

      if (audioRef.current) {
        audioRef.current.src = `data:audio/wav;base64,${data.audioBase64}`;
        audioRef.current.load();
        setActiveSingleCueId(null);
        setActiveCueIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to generate timed voiceover:', err);
      setGenerationError(err.message || 'Error generating timed AI voiceover.');
    } finally {
      isRequestInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  // Generate Full AI Speech for Walkthrough Mode
  const handleGenerateFullAudio = async (
    voiceOverride?: VoiceOption,
    accentOverride?: string,
    styleOverride?: string,
    textOverride?: string
  ) => {
    if (isRequestInFlightRef.current || cooldownSec > 0) return;

    const activeVoice = voiceOverride || selectedVoice;
    const activeAccent = accentOverride || selectedAccent;
    const activeStyle = styleOverride || selectedStyle;
    const textToSpeak = textOverride ?? scriptText;

    try {
      isRequestInFlightRef.current = true;
      setIsGenerating(true);
      setGenerationError(null);

      const accentObj = ACCENT_PRESETS.find((a) => a.id === activeAccent);
      const styleObj = STYLE_PRESETS.find((s) => s.id === activeStyle);
      let instruction = activeVoice.stylePrompt;
      if (accentObj) instruction += ` Speak ${accentObj.promptModifier}.`;
      if (styleObj) instruction += ` Pacing and tone: ${styleObj.prompt}.`;
      if (languageMode === 'hi') {
        instruction += ` Speak fluent, natural Hindi with clear English loanwords for hardware terms like UHR2, RFID, dBm, and Android 13.`;
      }

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: activeVoice.baseVoice,
          style: instruction,
          accent: activeVoice.accent.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setCooldownSec(errorData.retryAfterSec || 30);
        }
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('No audio data received in response');
      }

      setFullAudioBase64(data.audioBase64);

      if (audioRef.current) {
        audioRef.current.src = `data:audio/wav;base64,${data.audioBase64}`;
        audioRef.current.load();
        setActiveSegmentAudioIndex(null);
        setCurrentSegmentIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to generate full audio:', err);
      setGenerationError(err.message || 'Error generating AI speech. Check API configuration.');
    } finally {
      isRequestInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  const handleGenerateActiveProject = () => {
    if (projectMode === 'led-video-demo') {
      handleGenerateTimedDemo();
    } else {
      handleGenerateFullAudio();
    }
  };

  // Switch Project Mode
  const handleSwitchProject = (mode: ProjectMode) => {
    if (mode === projectMode) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
    setDuration(0);
    setFullAudioBase64(null);
    setActiveSingleCueId(null);
    setActiveSegmentAudioIndex(null);
    setProjectMode(mode);
  };

  // Handle language switch (Walkthrough mode)
  const handleLanguageSwitch = (lang: 'en' | 'hi') => {
    setLanguageMode(lang);
    setFullAudioBase64(null);
    setSegmentAudioMap({});
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    const nextText = lang === 'hi' ? HINDI_DEFAULT_SCRIPT : FULL_DEFAULT_SCRIPT;
    setScriptText(nextText);
  };

  // Play a single timed cue
  const handlePlaySingleCue = async (cue: TimedCue, idx: number) => {
    setActiveCueIndex(idx);
    if (cue.type === 'silence' || !cue.text.trim()) return;

    const existingTiming = cueTimingsMap[cue.id];
    if (existingTiming?.wavBase64) {
      playBase64Audio(existingTiming.wavBase64, undefined, cue.id);
      return;
    }

    try {
      setGeneratingCueId(cue.id);
      setGenerationError(null);

      const slotSec = Math.max(0.8, cue.endSec - cue.startSec);
      const styleInstruction = `${getFullStyleInstruction()} Deliver clearly within ${slotSec} seconds.`;

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cue.text,
          voiceName: selectedVoice.baseVoice,
          style: styleInstruction,
          accent: selectedVoice.accent.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.audioBase64) {
        setCueTimingsMap((prev) => ({
          ...prev,
          [cue.id]: {
            id: cue.id,
            type: 'speech',
            targetStartSec: cue.startSec,
            targetEndSec: cue.endSec,
            actualStartSec: cue.startSec,
            actualEndSec: cue.endSec,
            actualDurationSec: slotSec,
            wavBase64: data.audioBase64,
          },
        }));
        playBase64Audio(data.audioBase64, undefined, cue.id);
      }
    } catch (err: any) {
      console.error('Cue TTS failed:', err);
      playWithWebSpeech(cue.text);
    } finally {
      setGeneratingCueId(null);
    }
  };

  // Generate or Play Segment Speech (Walkthrough mode)
  const handlePlaySegment = async (index: number) => {
    const seg = segments[index];
    if (!seg) return;

    setCurrentSegmentIndex(index);

    if (segmentAudioMap[seg.id]) {
      playBase64Audio(segmentAudioMap[seg.id], index);
      return;
    }

    try {
      setGeneratingSegmentId(seg.id);
      setGenerationError(null);

      const styleInstruction = getFullStyleInstruction();

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: seg.text,
          voiceName: selectedVoice.baseVoice,
          style: styleInstruction,
          accent: selectedVoice.accent.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.audioBase64) {
        setSegmentAudioMap((prev) => ({ ...prev, [seg.id]: data.audioBase64 }));
        playBase64Audio(data.audioBase64, index);
      }
    } catch (err: any) {
      console.error('Segment TTS failed:', err);
      playWithWebSpeech(seg.text, index);
    } finally {
      setGeneratingSegmentId(null);
    }
  };

  const playBase64Audio = (base64: string, segIndex?: number, cueId?: string) => {
    ensureAudioContext();
    if (!audioRef.current) return;

    audioRef.current.src = `data:audio/wav;base64,${base64}`;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.volume = volume;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setActiveSegmentAudioIndex(segIndex !== undefined ? segIndex : null);
        setActiveSingleCueId(cueId || null);
      })
      .catch((e) => {
        console.warn('Playback interrupted:', e);
      });
  };

  const playWithWebSpeech = (text: string, segIndex?: number) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackRate;

      const availableVoices = window.speechSynthesis.getVoices();
      const indianVoice = availableVoices.find(
        (v) =>
          v.lang === 'en-IN' ||
          v.lang === 'hi-IN' ||
          v.name.toLowerCase().includes('india') ||
          v.name.toLowerCase().includes('hindi')
      );
      if (indianVoice) {
        utterance.voice = indianVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        if (segIndex !== undefined) setActiveSegmentAudioIndex(segIndex);
      };
      utterance.onend = () => {
        setIsPlaying(false);
        setActiveSegmentAudioIndex(null);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle Play / Pause (plays the full master track)
  const handleTogglePlay = () => {
    ensureAudioContext();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // If we were previously playing a single clip, reload the full master audio
      if ((activeSingleCueId || activeSegmentAudioIndex !== null) && fullAudioBase64) {
        audioRef.current.src = `data:audio/wav;base64,${fullAudioBase64}`;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.volume = volume;
        setActiveSingleCueId(null);
        setActiveSegmentAudioIndex(null);
      }

      if (!audioRef.current.src && !fullAudioBase64) {
        handleGenerateActiveProject();
        return;
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn('Play error:', e));
    }
  };

  const handleRestart = () => {
    if (audioRef.current && fullAudioBase64) {
      audioRef.current.src = `data:audio/wav;base64,${fullAudioBase64}`;
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setActiveCueIndex(0);
      setCurrentSegmentIndex(0);
      setActiveSingleCueId(null);
      setActiveSegmentAudioIndex(null);
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (projectMode === 'led-video-demo') {
        const idx = timedCues.findIndex((c) => newTime >= c.startSec && newTime < c.endSec);
        if (idx >= 0) setActiveCueIndex(idx);
      } else {
        const ratio = newTime / duration;
        const segIdx = Math.min(segments.length - 1, Math.floor(ratio * segments.length));
        setCurrentSegmentIndex(segIdx);
      }
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleVoiceChange = (voice: VoiceOption) => {
    setSelectedVoice(voice);
    const nextAccent = voice.accent === 'Indian' ? 'indian-english' : 'global-neutral';
    setSelectedAccent(nextAccent);
    setFullAudioBase64(null);
    setSegmentAudioMap({});
    setCueTimingsMap({});
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAccentChange = (accentId: string) => {
    setSelectedAccent(accentId);
    setFullAudioBase64(null);
    setSegmentAudioMap({});
    setCueTimingsMap({});
  };

  const handleStyleChange = (styleId: string) => {
    setSelectedStyle(styleId);
    setFullAudioBase64(null);
    setSegmentAudioMap({});
    setCueTimingsMap({});
  };

  const handleUpdateCueText = (cueId: string, newText: string) => {
    const updated = timedCues.map((c) => (c.id === cueId ? { ...c, text: newText } : c));
    setTimedCues(updated);
    setFullAudioBase64(null);
    setCueTimingsMap((prev) => {
      const next = { ...prev };
      delete next[cueId];
      return next;
    });
  };

  const handleDownloadDirectWav = () => {
    if (!fullAudioBase64) return;
    downloadAsMp3(fullAudioBase64, projectMode === 'led-video-demo'
        ? `UHR2_LED_Demo_Timed_Master_${selectedVoice.name}.wav`
        : `UHR2_Handheld_Reader_Demo_${selectedVoice.name}.wav`);
  };

  // Do not auto-consume TTS API quota on mount; user clicks Generate Voice or Play Narration on demand.

  // Build active DeviceSimulator segment from either project mode
  const activeCue = timedCues[activeCueIndex] || timedCues[0];
  const currentSimulatorSegment: ScriptSegment =
    projectMode === 'led-video-demo'
      ? {
          id: activeCue.id,
          stepNumber: activeCue.stepNumber,
          title: activeCue.title,
          shortSummary: `${activeCue.startSec}s – ${activeCue.endSec}s`,
          text: activeCue.type === 'silence' ? '(Timed silence pause)' : activeCue.text,
          deviceView: activeCue.deviceView,
          highlightButton: activeCue.deviceView === 'led-scanning' ? 'trigger' : 'none',
        }
      : segments[currentSegmentIndex] || segments[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 p-2 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  UHR2 Handheld Reader
                </h1>
                <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <span>{selectedVoice.flag}</span>
                  <span>{selectedVoice.name.toUpperCase()} VOICE</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Video Voiceover Studio • Exact Timestamp &amp; Silence Sync
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2">
            {projectMode === 'full-walkthrough' && (
              <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                <button
                  onClick={() => handleLanguageSwitch('en')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    languageMode === 'en'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageSwitch('hi')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    languageMode === 'hi'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  हिंदी
                </button>
              </div>
            )}

            {(
              <button
                onClick={() => setIsScriptModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">Script</span>
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Export MP3 audio, individual clips, and SRT subtitles"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export</span>
            </button>

            <button
              onClick={handleGenerateActiveProject}
              disabled={isGenerating || cooldownSec > 0}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
                isGenerating || cooldownSec > 0
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-500/20 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : cooldownSec > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wait {cooldownSec}s</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{fullAudioBase64 ? 'Regenerate' : 'Generate Voice'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Project Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSwitchProject('led-video-demo')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                projectMode === 'led-video-demo'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>LED Tag &amp; Settings Video Demo (0:00–0:42 Timed)</span>
            </button>

            <button
              onClick={() => handleSwitchProject('full-walkthrough')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                projectMode === 'full-walkthrough'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Full UHR2 Android 13 Demo</span>
            </button>
          </div>

          {/* Direct Master WAV Download CTA */}
          {fullAudioBase64 ? (
            <button
              onClick={handleDownloadDirectWav}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP3 for Video</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateActiveProject}
              disabled={isGenerating || cooldownSec > 0}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all ${
                isGenerating || cooldownSec > 0
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isGenerating
                  ? 'Generating Timed Audio...'
                  : cooldownSec > 0
                  ? `Rate Limit Cooling (${cooldownSec}s)`
                  : 'Generate AI Voiceover'}
              </span>
            </button>
          )}
        </div>

        {/* Active Voice Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-sky-950/30 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center space-x-3">
            <span className="text-xl">{selectedVoice.flag}</span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">
                  Voice: {selectedVoice.name} {selectedVoice.nativeName && `(${selectedVoice.nativeName})`} • {selectedVoice.accent} Accent
                </span>
                {fullAudioBase64 && !isGenerating && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready ({duration > 0 ? `${duration.toFixed(1)}s` : 'WAV'})</span>
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">
                {projectMode === 'led-video-demo'
                  ? 'Builds all cues at their timestamps, with silence in the gaps, into one video-ready WAV. Use Edit Script to change the lines and timings.'
                  : 'Authentic narration calibrated for technical RFID terminology like UHR2, dBm, EPC, and Android 13.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <label
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center space-x-1.5 cursor-pointer"
              title="On: lines flow back-to-back with a short breath (no dead air). Off: each line starts exactly at its timestamp."
            >
              <input
                type="checkbox"
                checked={tightFlow}
                onChange={(e) => {
                  setTightFlow(e.target.checked);
                  setFullAudioBase64(null);
                }}
              />
              <span>No gaps</span>
            </label>
            <button
              onClick={() => setActiveTab('voice')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Mic className="w-3 h-3" />
              <span>Switch Voice</span>
            </button>
          </div>
        </div>

        {/* Error / Cooldown Alert Banner */}
        {(generationError || cooldownSec > 0) && (
          <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-700/70 text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {cooldownSec > 0 ? `Rate Limit Cooldown (${cooldownSec}s remaining)` : 'Generation Notice:'}
                </span>{' '}
                {generationError}
              </div>
            </div>
            {cooldownSec === 0 && (
              <button
                onClick={handleGenerateActiveProject}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 cursor-pointer"
              >
                Retry Now
              </button>
            )}
          </div>
        )}

        {/* Waveform Audio Player */}
        <section className="space-y-4">
          <AudioWaveform
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            playbackRate={playbackRate}
            onRateChange={handleRateChange}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            analyser={analyserRef.current}
          />
        </section>

        {/* Studio View Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'visualizer'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {projectMode === 'led-video-demo' ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <Smartphone className="w-3.5 h-3.5" />
            )}
            <span>
              {projectMode === 'led-video-demo' ? 'Timed Cue Sheet & Preview' : 'Demonstration Visualizer'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'voice'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Indian &amp; Global Voices ({selectedVoice.name})</span>
          </button>

          <button
            onClick={() => setActiveTab('teleprompter')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'teleprompter'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Full Cue Script</span>
          </button>
        </div>

        {/* Tab 1: Visualizer + Cue Sheet / Step Director */}
        {activeTab === 'visualizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive UHR2 Device & LED Tag Preview */}
            <div className="lg:col-span-5 flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="w-full flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>UHR2 Video Frame Preview</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Synced
                </span>
              </div>

              <DeviceSimulator
                currentSegment={currentSimulatorSegment}
                totalSteps={projectMode === 'led-video-demo' ? timedCues.length : segments.length}
                isAudioPlaying={isPlaying}
                onSelectSegment={(step) => {
                  if (projectMode === 'led-video-demo') {
                    const idx = timedCues.findIndex((c) => c.stepNumber === step);
                    if (idx >= 0) setActiveCueIndex(idx);
                  } else {
                    const idx = segments.findIndex((s) => s.stepNumber === step);
                    if (idx >= 0) {
                      setCurrentSegmentIndex(idx);
                      handlePlaySegment(idx);
                    }
                  }
                }}
              />
            </div>

            {/* Right Column: Timed Cue Sheet OR 9-Step Walkthrough */}
            <div className="lg:col-span-7 space-y-4">
              {/* Active Cue Spotlight Card */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/40 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-xs">
                      {projectMode === 'led-video-demo'
                        ? `${activeCue.startSec}s – ${activeCue.endSec}s`
                        : `STEP ${currentSimulatorSegment.stepNumber} OF ${segments.length}`}
                    </span>
                    <h3 className="text-sm font-bold text-white">{currentSimulatorSegment.title}</h3>
                  </div>
                  <span className="text-xs text-amber-400 font-mono">
                    {projectMode === 'led-video-demo'
                      ? activeCue.type === 'silence'
                        ? 'Silence Gap'
                        : `${activeCue.endSec - activeCue.startSec}s Slot`
                      : currentSimulatorSegment.shortSummary}
                  </span>
                </div>

                <p className="text-base text-slate-100 font-medium leading-relaxed my-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  {projectMode === 'led-video-demo' && activeCue.type === 'silence'
                    ? `[Silence: ${activeCue.startSec}s – ${activeCue.endSec}s (${activeCue.endSec - activeCue.startSec}s visual pause)]`
                    : `“${currentSimulatorSegment.text}”`}
                </p>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>
                      Presenter: <strong className="text-amber-300">{selectedVoice.flag} {selectedVoice.name}</strong> ({selectedVoice.accent})
                    </span>
                  </div>

                  {projectMode === 'led-video-demo' ? (
                    activeCue.type === 'speech' && (
                      <button
                        onClick={() => handlePlaySingleCue(activeCue, activeCueIndex)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Audition Cue</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handlePlaySegment(currentSegmentIndex)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play this section</span>
                    </button>
                  )}
                </div>
              </div>

              {projectMode === 'led-video-demo' ? (
                <TimedTimeline
                  cues={timedCues}
                  activeCueIndex={activeCueIndex}
                  isPlaying={isPlaying}
                  activeSingleCueId={activeSingleCueId}
                  generatingCueId={generatingCueId}
                  cueTimingsMap={cueTimingsMap}
                  onSelectCue={(idx) => {
                    setActiveCueIndex(idx);
                    const cue = timedCues[idx];
                    if (cue && duration > 0 && fullAudioBase64 && activeSingleCueId === null) {
                      const timing = cueTimingsMap[cue.id];
                      handleSeek(timing ? timing.actualStartSec : cue.startSec);
                    }
                  }}
                  onPlaySingleCue={handlePlaySingleCue}
                  onUpdateCueText={handleUpdateCueText}
                  voiceName={selectedVoice.name}
                />
              ) : (
                <SegmentList
                  segments={segments}
                  currentSegmentIndex={currentSegmentIndex}
                  onSelectSegment={(idx) => {
                    setCurrentSegmentIndex(idx);
                    if (duration > 0) {
                      const targetTime = (idx / segments.length) * duration;
                      handleSeek(targetTime);
                    }
                  }}
                  onPlaySegment={handlePlaySegment}
                  isPlaying={isPlaying}
                  activeSegmentAudioIndex={activeSegmentAudioIndex}
                  segmentAudioMap={segmentAudioMap}
                  isGeneratingSegmentId={generatingSegmentId}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Voice & Tone Settings */}
        {activeTab === 'voice' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <VoiceSelector
              selectedVoiceId={selectedVoice.id}
              onSelectVoice={handleVoiceChange}
              selectedAccent={selectedAccent}
              onSelectAccent={handleAccentChange}
              selectedStyle={selectedStyle}
              onSelectStyle={handleStyleChange}
              isGenerating={isGenerating}
            />

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Selected Presenter: {selectedVoice.flag} {selectedVoice.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {selectedVoice.accent} Accent
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedVoice.persona} • Model: Gemini 3.8 Flash-Lite TTS
                </p>
              </div>

              <button
                onClick={() => {
                  handleGenerateActiveProject();
                  setActiveTab('visualizer');
                }}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <span className="w-3 h-3 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                    <span>Synthesizing Voice...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate With {selectedVoice.name}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Full Teleprompter Script */}
        {activeTab === 'teleprompter' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileEdit className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {projectMode === 'led-video-demo'
                      ? 'Timed Video Demo Cue Sheet (0:00 – 0:42)'
                      : `Demonstration Script (${languageMode === 'hi' ? 'हिंदी' : 'English'})`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {projectMode === 'led-video-demo'
                      ? 'Exact video synchronization script with timed silences'
                      : 'Verbatim demonstration script for the UHR2 Handheld Reader'}
                  </p>
                </div>
              </div>

              {(
                <button
                  onClick={() => setIsScriptModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Edit Script</span>
                </button>
              )}
            </div>

            {projectMode === 'led-video-demo' ? (
              <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                {timedCues.map((cue, idx) => (
                  <div
                    key={cue.id}
                    className={`p-3 rounded-lg border ${
                      activeCueIndex === idx
                        ? 'bg-amber-950/40 border-amber-500/40 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold text-amber-400 block mb-1">
                      {Math.floor(cue.startSec / 60)}:{String(cue.startSec % 60).padStart(2, '0')} –{' '}
                      {Math.floor(cue.endSec / 60)}:{String(cue.endSec % 60).padStart(2, '0')} (
                      {cue.endSec - cue.startSec} sec)
                    </span>
                    <p className="text-sm">
                      {cue.type === 'silence' ? `[Silence (${cue.endSec - cue.startSec} sec)]` : `“${cue.text}”`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 text-slate-200 leading-relaxed font-sans text-sm sm:text-base p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                {scriptText.split('\n\n').map((paragraph, pIdx) => (
                  <p
                    key={pIdx}
                    className={`p-2.5 rounded-lg transition-colors ${
                      currentSegmentIndex === pIdx
                        ? 'bg-amber-950/40 border border-amber-500/40 text-white font-medium shadow-sm'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>UHR2 Handheld RFID Reader Video Voiceover Studio</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Powered by Gemini 3.8 Flash-Lite TTS • 24 kHz WAV
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        fullAudioBase64={fullAudioBase64}
        segments={segments}
        timedCues={timedCues}
        cueTimingsMap={cueTimingsMap}
        isTimedMode={projectMode === 'led-video-demo'}
        currentVoice={selectedVoice.name}
      />

      <ScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        isTimed={projectMode === 'led-video-demo'}
        scriptText={projectMode === 'led-video-demo' ? cuesToScript(timedCues) : scriptText}
        onSaveScript={(newText) => {
          if (projectMode === 'led-video-demo') {
            try {
              setTimedCues(scriptToCues(newText, timedCues));
            } catch (e: any) {
              alert(e.message);
              return false;
            }
            setCueTimingsMap({});
            setActiveCueIndex(0);
          } else {
            setScriptText(newText);
          }
          setFullAudioBase64(null);
          setSegmentAudioMap({});
        }}
        onResetScript={() => {
          if (projectMode === 'led-video-demo') {
            setTimedCues(scriptToCues(DEFAULT_TIMED_SCRIPT));
            setCueTimingsMap({});
          } else {
            setScriptText(languageMode === 'hi' ? HINDI_DEFAULT_SCRIPT : FULL_DEFAULT_SCRIPT);
          }
          setFullAudioBase64(null);
          setSegmentAudioMap({});
        }}
      />
    </div>
  );
}
