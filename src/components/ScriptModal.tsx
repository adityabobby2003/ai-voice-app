import React, { useState } from 'react';
import { X, RotateCcw, Check, Sparkles, FileEdit, Volume2 } from 'lucide-react';
import { FULL_DEFAULT_SCRIPT } from '../data/scriptData';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptText: string;
  onSaveScript: (newScript: string) => void;
  onResetScript: () => void;
}

export const ScriptModal: React.FC<ScriptModalProps> = ({
  isOpen,
  onClose,
  scriptText,
  onSaveScript,
  onResetScript,
}) => {
  const [editedText, setEditedText] = useState(scriptText);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const wordCount = editedText.split(/\s+/).filter(Boolean).length;
  const charCount = editedText.length;
  // Average speaking pace ~130 words per minute
  const estimatedSeconds = Math.round((wordCount / 130) * 60);
  const estMins = Math.floor(estimatedSeconds / 60);
  const estSecs = estimatedSeconds % 60;

  const handleSave = () => {
    onSaveScript(editedText);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setEditedText(FULL_DEFAULT_SCRIPT);
    onResetScript();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileEdit className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-white">Edit Demonstration Script</h3>
              <p className="text-xs text-slate-400">
                Customize the narrator's text before generating AI speech
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Script text editor */}
        <div className="my-3 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>
              {wordCount} words • {charCount} chars
            </span>
            <span className="text-sky-400">
              Est. audio runtime: ~{estMins}m {estSecs}s
            </span>
          </div>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={14}
            className="w-full flex-1 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-sans text-sm leading-relaxed resize-none focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="Type or paste narration script here..."
          />
        </div>

        {/* Footer controls */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5 transition-colors"
            title="Restore original demonstration script"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Original</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white flex items-center space-x-1.5 shadow-md shadow-sky-500/20"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  <span className="text-slate-950 font-bold">Updated!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
