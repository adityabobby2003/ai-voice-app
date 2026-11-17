import React, { useState } from 'react';
import {
  Play,
  Pause,
  VolumeX,
  Download,
  Clock,
  Edit3,
  Check,
  Radio,
  Lightbulb,
  Droplets,
  Sliders,
} from 'lucide-react';
import { TimedCue } from '../data/scriptData';

export interface CueTimingResult {
  id: string;
  type: 'speech' | 'silence';
  targetStartSec: number;
  targetEndSec: number;
  actualStartSec: number;
  actualEndSec: number;
  actualDurationSec: number;
  wavBase64?: string;
}

interface TimedTimelineProps {
  cues: TimedCue[];
  activeCueIndex: number;
  isPlaying: boolean;
  activeSingleCueId: string | null;
  generatingCueId: string | null;
  cueTimingsMap: Record<string, CueTimingResult>;
  onSelectCue: (index: number) => void;
  onPlaySingleCue: (cue: TimedCue, index: number) => void;
  onUpdateCueText: (cueId: string, newText: string) => void;
  voiceName: string;
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const TimedTimeline: React.FC<TimedTimelineProps> = ({
  cues,
  activeCueIndex,
  isPlaying,
  activeSingleCueId,
  generatingCueId,
  cueTimingsMap,
  onSelectCue,
  onPlaySingleCue,
  onUpdateCueText,
  voiceName,
}) => {
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<string>('');

  const getCueIcon = (cue: TimedCue) => {
    if (cue.type === 'silence') {
      return <VolumeX className="w-4 h-4 text-slate-400" />;
    }
    switch (cue.deviceView) {
      case 'led-tag':
        return <Lightbulb className="w-4 h-4 text-emerald-400" />;
      case 'waterproof-led':
        return <Droplets className="w-4 h-4 text-sky-400" />;
      case 'reader-settings':
        return <Sliders className="w-4 h-4 text-amber-400" />;
      default:
        return <Radio className="w-4 h-4 text-amber-400" />;
    }
  };

  const handleDownloadSingleClip = (cue: TimedCue, wavBase64: string) => {
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${wavBase64}`;
    link.download = `UHR2_Cue_${cue.stepNumber}_${formatClock(cue.startSec).replace(':', '-')}_${voiceName}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalEndSec = cues[cues.length - 1]?.endSec || 42;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg text-white space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Timed Video Voiceover Cue Sheet</span>
          </h3>
          <p className="text-xs text-slate-400">
            Exact timestamps &amp; baked-in 2s silence gaps for video editing ({cues.length} cues • 0:00–{formatClock(totalEndSec)})
          </p>
        </div>

        {/* Visual Mini Timeline Bar */}
        <div className="w-full sm:w-56 h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          {cues.map((cue, idx) => {
            const widthPct = ((cue.endSec - cue.startSec) / totalEndSec) * 100;
            const isActive = idx === activeCueIndex;
            return (
              <div
                key={cue.id}
                onClick={() => onSelectCue(idx)}
                style={{ width: `${widthPct}%` }}
                className={`h-full border-r border-slate-950 cursor-pointer transition-colors ${
                  cue.type === 'silence'
                    ? isActive
                      ? 'bg-slate-500'
                      : 'bg-slate-800'
                    : isActive
                    ? 'bg-amber-400'
                    : 'bg-sky-500/70 hover:bg-sky-400'
                }`}
                title={`${formatClock(cue.startSec)}–${formatClock(cue.endSec)}: ${
                  cue.type === 'silence' ? 'Silence' : cue.title
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Cue Cards */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {cues.map((cue, idx) => {
          const isActive = activeCueIndex === idx;
          const isSilence = cue.type === 'silence';
          const timing = cueTimingsMap[cue.id];
          const isThisPlaying = isPlaying && activeSingleCueId === cue.id;
          const isThisGenerating = generatingCueId === cue.id;
          const slotDuration = cue.endSec - cue.startSec;

          return (
            <div
              key={cue.id}
              onClick={() => onSelectCue(idx)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSilence
                  ? isActive
                    ? 'bg-slate-800/70 border-slate-500'
                    : 'bg-slate-950/30 border-slate-800/60 border-dashed'
                  : isActive
                  ? 'bg-slate-800/90 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                {/* Left Timestamp + Content */}
                <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSilence
                        ? 'bg-slate-900 border border-slate-800'
                        : isActive
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-slate-800'
                    }`}
                  >
                    {getCueIcon(cue)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSilence
                            ? 'bg-slate-800 text-slate-400'
                            : isActive
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {formatClock(cue.startSec)} – {formatClock(cue.endSec)} ({slotDuration}s)
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {isSilence ? 'Silence Gap' : cue.title}
                      </span>

                      {timing && !isSilence && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Clip: {timing.actualDurationSec.toFixed(1)}s @ {formatClock(timing.actualStartSec)}
                        </span>
                      )}
                    </div>

                    {isSilence ? (
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        Pure digital silence ({slotDuration} seconds) inserted on master WAV track.
                      </p>
                    ) : editingCueId === cue.id ? (
                      <div
                        className="mt-2 flex items-center space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          className="flex-1 bg-slate-950 border border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            onUpdateCueText(cue.id, draftText);
                            setEditingCueId(null);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          title="Save cue text"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">
                        “{cue.text}”
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons for Speech Cues */}
                {!isSilence && (
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCueId(cue.id);
                        setDraftText(cue.text);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60"
                      title="Edit cue text"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {timing?.wavBase64 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingleClip(cue, timing.wavBase64!);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700/60"
                        title="Download this individual clip (.wav)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySingleCue(cue, idx);
                      }}
                      disabled={isThisGenerating}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isThisPlaying
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : isActive
                          ? 'bg-sky-500 border-sky-400 text-white hover:bg-sky-400'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                      title="Play this clip"
                    >
                      {isThisGenerating ? (
                        <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin block" />
                      ) : isThisPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
