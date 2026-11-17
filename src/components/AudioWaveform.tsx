import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface AudioWaveformProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  playbackRate: number;
  onRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  analyser?: AnalyserNode | null;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isPlaying,
  currentTime,
  duration,
  onSeek,
  onTogglePlay,
  onRestart,
  playbackRate,
  onRateChange,
  volume,
  onVolumeChange,
  analyser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 48;
      const barWidth = Math.max(2, Math.floor((width - (numBars - 1) * 3) / numBars));
      const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

      if (analyser && isPlaying && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 3);
        const barRatio = i / numBars;
        const isPast = barRatio <= progressRatio;

        let barHeight = 6;
        if (isPlaying) {
          if (dataArray && analyser) {
            const index = Math.floor((i / numBars) * dataArray.length * 0.7);
            const val = dataArray[index] || 0;
            barHeight = Math.max(6, (val / 255) * (height * 0.85));
          } else {
            // Simulated bounce if no analyser node connected
            const time = Date.now() / 200;
            const wave = Math.sin(time + i * 0.4) * 0.5 + 0.5;
            barHeight = 8 + wave * (height * 0.6);
          }
        } else {
          // Resting waveform profile
          const center = Math.abs(i - numBars / 2) / (numBars / 2);
          barHeight = 10 + (1 - center) * 16;
        }

        const y = (height - barHeight) / 2;

        if (isPast) {
          ctx.fillStyle = isPlaying ? '#38bdf8' : '#60a5fa'; // Sky-400 / Blue-400
        } else {
          ctx.fillStyle = '#334155'; // Slate-700
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, currentTime, duration, analyser]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl text-white">
      {/* Top Header / Track info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            24 kHz Studio WAV
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center space-x-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
          {[0.85, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => onRateChange(rate)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                playbackRate === rate
                  ? 'bg-sky-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Visualizer waveform canvas */}
      <div
        onClick={handleScrub}
        className="w-full h-16 sm:h-20 bg-slate-950/80 rounded-xl overflow-hidden cursor-pointer relative border border-slate-800/80 flex items-center justify-center p-2 group hover:border-slate-700 transition-colors"
        title="Click anywhere to scrub playback"
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={80}
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Playhead progress overlay line */}
        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none transition-all shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            style={{
              left: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`,
            }}
          />
        )}
      </div>

      {/* Playback Controls Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={onRestart}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Restart from beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={duration <= 0}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md active:scale-95 ${
              duration <= 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                : 'bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-sky-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>{currentTime > 0 ? 'Resume' : 'Play Narration'}</span>
              </>
            )}
          </button>
        </div>

        {/* Volume slider */}
        <div className="flex items-center space-x-2 min-w-[140px]">
          <button
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <span className="text-xs text-slate-400 font-mono w-7 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
