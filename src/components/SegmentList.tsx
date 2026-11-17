import React from 'react';
import { Play, Pause, Radio, CheckCircle, Smartphone, Sliders, Layers, Trash2 } from 'lucide-react';
import { ScriptSegment } from '../data/scriptData';

interface SegmentListProps {
  segments: ScriptSegment[];
  currentSegmentIndex: number;
  onSelectSegment: (index: number) => void;
  onPlaySegment: (index: number) => void;
  isPlaying: boolean;
  activeSegmentAudioIndex: number | null;
  segmentAudioMap: Record<string, string>; // segmentId -> audioBase64
  isGeneratingSegmentId: string | null;
}

export const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  currentSegmentIndex,
  onSelectSegment,
  onPlaySegment,
  isPlaying,
  activeSegmentAudioIndex,
  segmentAudioMap,
  isGeneratingSegmentId,
}) => {
  const getStepIcon = (view: ScriptSegment['deviceView']) => {
    switch (view) {
      case 'overview':
      case 'summary':
        return <CheckCircle className="w-4 h-4 text-sky-400" />;
      case 'side-buttons':
      case 'booting':
        return <Smartphone className="w-4 h-4 text-amber-400" />;
      case 'android-settings':
        return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'antenna-power':
        return <Sliders className="w-4 h-4 text-purple-400" />;
      case 'scanning-active':
      case 'scanned-results':
      case 'inventory-ready':
        return <Radio className="w-4 h-4 text-rose-400" />;
      case 'clear-action':
        return <Trash2 className="w-4 h-4 text-amber-400" />;
      default:
        return <Radio className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg text-white space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white">Demonstration Steps &amp; Narration</h3>
          <p className="text-xs text-slate-400">9 synchronized demonstration scenes</p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Active: Step {currentSegmentIndex + 1}/9
        </span>
      </div>

      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {segments.map((seg, idx) => {
          const isActive = currentSegmentIndex === idx;
          const isSegmentPlaying = isPlaying && activeSegmentAudioIndex === idx;
          const isGeneratingThis = isGeneratingSegmentId === seg.id;
          const hasAudio = !!segmentAudioMap[seg.id];

          return (
            <div
              key={seg.id}
              onClick={() => onSelectSegment(idx)}
              className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-slate-800/90 border-sky-500 shadow-md shadow-sky-500/10'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isActive ? 'bg-sky-500/20 border border-sky-500/40' : 'bg-slate-800'
                    }`}
                  >
                    {getStepIcon(seg.deviceView)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        Step {seg.stepNumber}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate">{seg.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed font-sans">
                      "{seg.text}"
                    </p>
                  </div>
                </div>

                {/* Individual Play Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaySegment(idx);
                  }}
                  disabled={isGeneratingThis}
                  className={`p-2 rounded-lg border transition-all shrink-0 cursor-pointer ${
                    isSegmentPlaying
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-sm'
                      : isActive
                      ? 'bg-sky-500 border-sky-400 text-white hover:bg-sky-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title="Play this scene"
                >
                  {isGeneratingThis ? (
                    <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin block" />
                  ) : isSegmentPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>

              {/* Status footer for segment */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                <span>View: {seg.deviceView}</span>
                {hasAudio && (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>AI Audio Cached</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
