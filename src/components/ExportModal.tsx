import { downloadAsMp3 } from '../utils/mp3';
import React, { useState } from 'react';
import { X, Download, FileText, Check, Copy, Film, Layers } from 'lucide-react';
import { ScriptSegment, TimedCue } from '../data/scriptData';
import { CueTimingResult } from './TimedTimeline';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullAudioBase64: string | null;
  segments: ScriptSegment[];
  timedCues?: TimedCue[];
  cueTimingsMap?: Record<string, CueTimingResult>;
  isTimedMode?: boolean;
  currentVoice: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  fullAudioBase64,
  segments,
  timedCues = [],
  cueTimingsMap = {},
  isTimedMode = false,
  currentVoice,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedSrt, setCopiedSrt] = useState(false);

  if (!isOpen) return null;

  const formatSrtTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.round(ms % 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  };

  // Download complete WAV audio
  const handleDownloadWav = () => {
    if (!fullAudioBase64) return;
    downloadAsMp3(fullAudioBase64, isTimedMode
      ? `UHR2_LED_Demo_Timed_Master_${currentVoice}.wav`
      : `UHR2_Handheld_Reader_Demo_${currentVoice}.wav`);
  };

  // Generate SRT Subtitles
  const generateSrtContent = () => {
    if (isTimedMode && timedCues.length > 0) {
      let srt = '';
      let index = 1;
      timedCues.forEach((cue) => {
        if (cue.type === 'silence' || !cue.text.trim()) return;
        const timing = cueTimingsMap[cue.id];
        const startMs = (timing ? timing.actualStartSec : cue.startSec) * 1000;
        const endMs = (timing ? timing.actualEndSec : cue.endSec) * 1000;

        srt += `${index++}\n`;
        srt += `${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n`;
        srt += `${cue.text}\n\n`;
      });
      return srt;
    }

    let srt = '';
    let currentTimeMs = 0;

    segments.forEach((seg, index) => {
      const wordCount = seg.text.split(/\s+/).filter(Boolean).length;
      const durationSeconds = Math.max(3, Math.round(wordCount / 2.2));
      const endMs = currentTimeMs + durationSeconds * 1000;

      srt += `${index + 1}\n`;
      srt += `${formatSrtTime(currentTimeMs)} --> ${formatSrtTime(endMs)}\n`;
      srt += `${seg.text}\n\n`;

      currentTimeMs = endMs + 500;
    });

    return srt;
  };

  const handleDownloadSrt = () => {
    const srtContent = generateSrtContent();
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isTimedMode ? `UHR2_LED_Demo_Timed.srt` : `UHR2_Demo_Subtitles.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    const fullText = isTimedMode
      ? timedCues
          .map((c) =>
            c.type === 'silence'
              ? `[${c.startSec}s - ${c.endSec}s: Silence]`
              : `[${c.startSec}s - ${c.endSec}s] ${c.text}`
          )
          .join('\n\n')
      : segments.map((s) => s.text).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopySrt = () => {
    const srt = generateSrtContent();
    navigator.clipboard.writeText(srt);
    setCopiedSrt(true);
    setTimeout(() => setCopiedSrt(false), 2000);
  };

  const speechClipsWithAudio = isTimedMode
    ? timedCues.filter((c) => c.type === 'speech' && cueTimingsMap[c.id]?.wavBase64)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Export Video Voiceover &amp; Assets</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content options */}
        <div className="py-4 space-y-3">
          {/* WAV Audio file */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                <span>{isTimedMode ? 'Timed Master Track (.MP3)' : 'Studio Audio (.MP3)'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono">
                  24kHz Mono 16-bit
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isTimedMode
                  ? `Single timeline track with exact 2s silences baked in (${currentVoice})`
                  : `Full-length high-fidelity speech narration by ${currentVoice}`}
              </p>
            </div>
            <button
              onClick={handleDownloadWav}
              disabled={!fullAudioBase64}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
                fullAudioBase64
                  ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-md'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{fullAudioBase64 ? 'Download MP3' : 'Not Generated'}</span>
            </button>
          </div>

          {/* Individual Clips List (Timed Mode) */}
          {speechClipsWithAudio.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Individual Cue Clips ({speechClipsWithAudio.length} WAVs)</span>
                </h4>
                <span className="text-[10px] text-slate-400">For manual NLE placement</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {speechClipsWithAudio.map((cue) => {
                  const timing = cueTimingsMap[cue.id];
                  return (
                    <button
                      key={cue.id}
                      onClick={() => {
                        downloadAsMp3(timing.wavBase64!, `UHR2_Cue_${cue.stepNumber}_${currentVoice}.wav`);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-[11px] cursor-pointer"
                    >
                      <span className="truncate pr-2 text-slate-200 font-medium">
                        #{cue.stepNumber} ({cue.startSec}s–{cue.endSec}s)
                      </span>
                      <Download className="w-3 h-3 text-amber-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtitles (.SRT) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Synchronized Subtitles (.SRT)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                  Timed Captions
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Ready for Premiere Pro, CapCut, DaVinci Resolve, and YouTube
              </p>
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={handleCopySrt}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 cursor-pointer"
                title="Copy SRT to clipboard"
              >
                {copiedSrt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleDownloadSrt}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1.5 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Download SRT</span>
              </button>
            </div>
          </div>

          {/* Full Script Text */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">Narration Cue Sheet (.TXT)</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Full timestamped script for your video production notes
              </p>
            </div>
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
