import React, { useState } from 'react';
import { Sparkles, Mic, Check, Globe } from 'lucide-react';
import {
  INDIAN_VOICES,
  GLOBAL_VOICES,
  ACCENT_PRESETS,
  STYLE_PRESETS,
  VoiceOption,
} from '../data/scriptData';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoice: (voice: VoiceOption) => void;
  selectedAccent: string;
  onSelectAccent: (accentId: string) => void;
  selectedStyle: string;
  onSelectStyle: (styleId: string) => void;
  isGenerating: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onSelectVoice,
  selectedAccent,
  onSelectAccent,
  selectedStyle,
  onSelectStyle,
  isGenerating,
}) => {
  const [activeCategory, setActiveCategory] = useState<'indian' | 'global'>('indian');

  const displayedVoices = activeCategory === 'indian' ? INDIAN_VOICES : GLOBAL_VOICES;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl text-white space-y-6">
      {/* Header with Indian Voice Highlight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 p-2 shadow-lg shadow-amber-500/20 flex items-center justify-center text-white">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Voice &amp; Accent Studio
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🇮🇳 Indian Voices Enabled
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authentic Indian English &amp; Global AI Speech powered by Gemini 3.8 TTS
            </p>
          </div>
        </div>

        {/* Accent / Locale Switcher */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveCategory('indian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeCategory === 'indian'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🇮🇳</span>
            <span>Indian Voices (5)</span>
          </button>
          <button
            onClick={() => setActiveCategory('global')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeCategory === 'global'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌐</span>
            <span>Global Voices (5)</span>
          </button>
        </div>
      </div>

      {/* Voice cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <span>{activeCategory === 'indian' ? 'Indian Presenters & Specialists' : 'International Presenters'}</span>
            <span className="text-[10px] text-amber-400 font-normal">
              {activeCategory === 'indian' ? '(Clear Indian English Accent)' : '(Neutral Global Delivery)'}
            </span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            Output: 24kHz Uncompressed WAV
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {displayedVoices.map((voice: VoiceOption) => {
            const isSelected = selectedVoiceId === voice.id;
            return (
              <button
                key={voice.id}
                disabled={isGenerating}
                onClick={() => onSelectVoice(voice)}
                className={`relative p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-500 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/80 scale-[1.02]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-slate-950">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <div>
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="text-base">{voice.flag}</span>
                    <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {voice.name}
                    </span>
                    {voice.nativeName && (
                      <span className="text-[11px] text-amber-400/80 font-medium">
                        ({voice.nativeName})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mb-1.5">
                    {voice.gender} • {voice.accent} Accent
                  </div>
                  <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                    {voice.persona}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-amber-400/90 font-medium block truncate">
                    {voice.bestFor}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent & Dialect Presets */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
          Accent &amp; Dialect Tuning
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ACCENT_PRESETS.map((accent) => {
            const isSelected = selectedAccent === accent.id;
            return (
              <button
                key={accent.id}
                disabled={isGenerating}
                onClick={() => onSelectAccent(accent.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/40 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>{accent.label}</span>
                  </span>
                  {isSelected && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {accent.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Presentation Style */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
          Delivery Cadence &amp; Energy
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {STYLE_PRESETS.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                disabled={isGenerating}
                onClick={() => onSelectStyle(style.id)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500/80 ring-1 ring-sky-500/40 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{style.label}</span>
                  {isSelected && <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {style.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
