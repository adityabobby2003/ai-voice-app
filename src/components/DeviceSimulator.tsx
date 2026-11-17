import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Battery,
  Signal,
  Settings,
  Radio,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Cpu,
  Layers,
  Droplets,
  Lightbulb,
  Sliders,
  VolumeX,
} from 'lucide-react';
import { DEMO_EPC_TAGS, MockEpcTag, ScriptSegment } from '../data/scriptData';

interface DeviceSimulatorProps {
  currentSegment: ScriptSegment;
  totalSteps?: number;
  isAudioPlaying: boolean;
  onSelectSegment?: (stepNumber: number) => void;
}

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({
  currentSegment,
  totalSteps = 9,
  isAudioPlaying,
  onSelectSegment,
}) => {
  const [devicePower, setDevicePower] = useState<boolean>(true);
  const [antennaPower, setAntennaPower] = useState<number>(15);
  const [activeTab, setActiveTab] = useState<'inventory' | 'settings'>('inventory');
  const [scannedTags, setScannedTags] = useState<MockEpcTag[]>(DEMO_EPC_TAGS.slice(0, 8));
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [triggerPulled, setTriggerPulled] = useState<boolean>(false);

  // Sync simulator state with narration segment
  useEffect(() => {
    if (currentSegment.deviceView === 'booting') {
      setDevicePower(true);
    } else if (
      currentSegment.deviceView === 'antenna-power' ||
      currentSegment.deviceView === 'reader-settings'
    ) {
      setActiveTab('settings');
      setAntennaPower(15);
      setIsScanning(false);
      setTriggerPulled(false);
    } else if (
      currentSegment.deviceView === 'inventory-ready' ||
      currentSegment.deviceView === 'scanning-active' ||
      currentSegment.deviceView === 'led-scanning' ||
      currentSegment.deviceView === 'led-tag' ||
      currentSegment.deviceView === 'waterproof-led'
    ) {
      setActiveTab('inventory');
      const scanningNow =
        currentSegment.deviceView === 'scanning-active' ||
        currentSegment.deviceView === 'led-scanning' ||
        currentSegment.deviceView === 'led-tag' ||
        currentSegment.deviceView === 'waterproof-led';
      setIsScanning(scanningNow);
      setTriggerPulled(scanningNow);
      setScannedTags(DEMO_EPC_TAGS.slice(0, 8));
    } else if (currentSegment.deviceView === 'scanned-results') {
      setActiveTab('inventory');
      setIsScanning(false);
      setTriggerPulled(false);
    } else if (currentSegment.deviceView === 'clear-action') {
      setActiveTab('inventory');
      setIsScanning(true);
      setTriggerPulled(true);
      setScannedTags(DEMO_EPC_TAGS.slice(0, 12));
    } else {
      setIsScanning(false);
      setTriggerPulled(false);
    }
  }, [currentSegment]);

  const handleClearTags = () => {
    setScannedTags([]);
    if (onSelectSegment) onSelectSegment(8);
  };

  const handleTriggerPress = () => {
    setIsScanning((prev) => !prev);
    setTriggerPulled((prev) => !prev);
    if (!isScanning) {
      if (scannedTags.length === 0) {
        setScannedTags(DEMO_EPC_TAGS.slice(0, 8));
      }
    }
  };

  const view = currentSegment.deviceView;
  const highlight = currentSegment.highlightButton;

  return (
    <div className="flex flex-col items-center">
      {/* Device Frame */}
      <div className="relative w-full max-w-[340px] sm:max-w-[370px]">
        {/* UHF RFID Reader Top Antenna Bulge */}
        <div className="mx-auto w-52 sm:w-56 h-10 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-t-3xl border-t-2 border-x-2 border-slate-600 shadow-xl relative flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Radio
              className={`w-4 h-4 transition-colors ${
                isScanning || isAudioPlaying && view.includes('scan')
                  ? 'text-sky-400 animate-pulse'
                  : 'text-slate-400'
              }`}
            />
            <span className="text-[11px] font-mono tracking-wider font-bold text-slate-300">
              UHR2 UHF RFID 902-928MHz
            </span>
          </div>

          {/* Radiating RFID wave visualization when scanning */}
          {(isScanning || (isAudioPlaying && (view === 'scanning-active' || view === 'clear-action'))) && (
            <div className="absolute -top-6 inset-x-0 flex justify-center pointer-events-none">
              <span className="relative flex h-5 w-28">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-5 w-28 bg-sky-500/30 border border-sky-400 text-[10px] text-sky-200 items-center justify-center font-bold tracking-widest">
                  RFID RF TX ACTIVE
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Handheld Body Casing */}
        <div className="relative bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-4 sm:p-5 rounded-3xl border-2 border-slate-700 shadow-2xl shadow-black/80">
          {/* Rugged Corner Bumpers */}
          <div className="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 rounded-tl-xl border border-slate-900/60 pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-tr-xl border border-slate-900/60 pointer-events-none" />
          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-amber-500 rounded-bl-xl border border-slate-900/60 pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-br-xl border border-slate-900/60 pointer-events-none" />

          {/* Side Hardware Buttons Callout */}
          {/* Power Button (Right Side) */}
          <button
            onClick={() => setDevicePower(!devicePower)}
            className={`absolute -right-3 top-20 w-3.5 h-10 rounded-r-md border border-slate-600 transition-all cursor-pointer ${
              highlight === 'power' || view === 'side-buttons'
                ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] ring-2 ring-amber-300'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title="Physical Power Button"
          >
            <span className="sr-only">Power Button</span>
          </button>
          {(highlight === 'power' || view === 'side-buttons') && (
            <div className="absolute -right-28 top-18 bg-amber-500 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded shadow-lg animate-bounce pointer-events-none flex items-center space-x-1">
              <span>Power Button</span>
            </div>
          )}

          {/* Volume Buttons (Right Side below power) */}
          <div
            className={`absolute -right-3 top-34 w-3.5 h-14 rounded-r-md border border-slate-600 transition-all ${
              view === 'side-buttons'
                ? 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]'
                : 'bg-slate-700'
            }`}
          >
            <span className="sr-only">Volume Buttons</span>
          </div>
          {view === 'side-buttons' && (
            <div className="absolute -right-30 top-36 bg-sky-500 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none">
              Volume +/-
            </div>
          )}

          {/* Device Top Speaker & Status LED */}
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  devicePower
                    ? isScanning
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-emerald-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                UHR2 PRO
              </span>
            </div>
            <div className="w-16 h-1.5 bg-slate-950 rounded-full border border-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-sky-600" />
            </div>
          </div>

          {/* Screen Display Container */}
          <div className="w-full h-[410px] sm:h-[440px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col relative select-none">
            {/* Status Bar */}
            <div className="bg-slate-900/90 text-slate-300 px-3 py-1 flex items-center justify-between text-[11px] font-mono border-b border-slate-800">
              <span>09:42</span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-sky-400 font-sans font-medium">UHR2 RFID</span>
                <Signal className="w-3 h-3 text-emerald-400" />
                <Wifi className="w-3 h-3 text-slate-300" />
                <div className="flex items-center space-x-1">
                  <span>94%</span>
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* SCREEN VIEW CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
              {/* VIEW: OVERVIEW */}
              {view === 'overview' && (
                <div className="flex-1 p-4 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950">
                  <div className="text-center pt-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-500 p-3 shadow-lg shadow-sky-500/20 flex items-center justify-center mb-3">
                      <Radio className="w-9 h-9 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-white tracking-wide">UHR2 Reader</h4>
                    <p className="text-xs text-sky-400 mt-0.5">High Performance Handheld</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">OS Version</span>
                      <span className="font-semibold text-emerald-400">Android 13</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">RFID Module</span>
                      <span className="font-semibold text-sky-400">Gen2 Impinj E710</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Antenna Power</span>
                      <span className="font-semibold text-amber-400">5 - 33 dBm</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Form Factor</span>
                      <span className="font-semibold text-slate-200">Pistol Grip</span>
                    </div>
                  </div>

                  <div className="text-center pb-2">
                    <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ready for live product demonstration</span>
                    </span>
                  </div>
                </div>
              )}

              {/* VIEW: SIDE BUTTONS */}
              {view === 'side-buttons' && (
                <div className="flex-1 p-4 flex flex-col justify-center items-center text-center bg-slate-950">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
                    <Smartphone className="w-7 h-7 text-amber-400" />
                  </div>
                  <h4 className="font-bold text-white text-base mb-1">Hardware Interface</h4>
                  <p className="text-xs text-slate-300 max-w-[220px] leading-relaxed mb-4">
                    Side Power & Volume controls with bottom ergonomic trigger for rapid RFID inventorying.
                  </p>
                  <div className="w-full space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300">
                      <span>Side Power Button</span>
                      <span className="font-mono text-[10px]">Tap to boot</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      <span>Volume Up / Down</span>
                      <span className="font-mono text-[10px]">Beep Audio</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-sky-500/40 text-sky-300">
                      <span>Pistol Grip Trigger</span>
                      <span className="font-mono text-[10px]">Scan Start / Stop</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: BOOTING */}
              {view === 'booting' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-full border-4 border-t-amber-400 border-r-slate-800 border-b-slate-800 border-l-slate-800 animate-spin" />
                    <Radio className="w-7 h-7 text-amber-400 absolute inset-0 m-auto" />
                  </div>
                  <h4 className="font-bold text-base text-white">Powering On...</h4>
                  <p className="text-xs text-slate-400 mt-1">UHR2 Handheld OS Initializing</p>
                  <div className="mt-4 px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-[11px] font-mono text-emerald-400">
                    POWER STATUS: OK
                  </div>
                </div>
              )}

              {/* VIEW: ANDROID 13 SETTINGS */}
              {view === 'android-settings' && (
                <div className="flex-1 flex flex-col bg-slate-900">
                  {/* Settings Header */}
                  <div className="bg-slate-800/80 p-3 border-b border-slate-700/60 flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-slate-300" />
                    <span className="text-xs font-semibold text-white">Settings &gt; About Phone</span>
                  </div>

                  <div className="p-3 space-y-2 flex-1 overflow-y-auto text-xs">
                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Device Name</span>
                      <span className="font-semibold text-white">UHR2 Handheld RFID Terminal</span>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Model &amp; Hardware</span>
                      <span className="font-semibold text-slate-200">UHR2-Gen2 Industrial</span>
                    </div>

                    {/* Highlighted Android 13 row */}
                    <div className="p-2.5 bg-emerald-950/50 rounded-lg border-2 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                          Android Version
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-lg font-black text-white block mt-0.5">
                        Android 13
                      </span>
                      <span className="text-[10px] text-emerald-200">
                        API Level 33 | Security Patch Verified
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Kernel Version</span>
                      <span className="font-mono text-[11px] text-slate-300">5.15.78-rfid-rt</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: ANTENNA POWER (SETTINGS TAB) */}
              {view === 'antenna-power' && (
                <div className="flex-1 flex flex-col bg-slate-900">
                  <div className="bg-sky-950/80 px-3 py-2 border-b border-sky-800/40 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Radio className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-white">UHR2 RFID Settings</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      UHF Gen2
                    </span>
                  </div>

                  <div className="p-3.5 space-y-3 flex-1 overflow-y-auto text-xs">
                    {/* Antenna Power Box with Slider */}
                    <div className="p-3 bg-slate-950 rounded-xl border-2 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white text-xs flex items-center space-x-1">
                          <span>Antenna Power Setting</span>
                        </span>
                        <span className="text-base font-black text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          {antennaPower} dBm
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mb-3">
                        Adjust RF output level according to test requirements.
                      </p>

                      <input
                        type="range"
                        min={5}
                        max={33}
                        value={antennaPower}
                        onChange={(e) => setAntennaPower(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                        <span>5 dBm (Min)</span>
                        <span className="text-amber-300 font-bold">15 dBm (Demo)</span>
                        <span>33 dBm (Max)</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Operating Region</span>
                        <span className="font-mono text-slate-200">FCC 902-928 MHz</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Session &amp; Target</span>
                        <span className="font-mono text-slate-200">S0 / Target A</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: LED TAG SHOWCASE */}
              {view === 'led-tag' && (
                <div className="flex-1 p-4 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>RFID TAG DETECTED</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      LED ACTIVE
                    </span>
                  </div>

                  <div className="my-auto flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <div className="w-24 h-16 rounded-2xl bg-slate-800 border-2 border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.45)] flex items-center justify-center relative">
                        <div className="w-5 h-5 rounded-full bg-emerald-400 animate-ping absolute top-2 right-2 opacity-75" />
                        <div className="w-4 h-4 rounded-full bg-emerald-300 shadow-[0_0_16px_#34d399] absolute top-2.5 right-2.5" />
                        <Lightbulb className="w-8 h-8 text-emerald-300" />
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-white">Standard LED RFID Tag</h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-[230px] leading-relaxed">
                      Built-in high-visibility LED lights up instantly every time the UHR2 reader detects this tag.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-slate-400">EPC: E280...LED1</span>
                    <span className="text-emerald-400 font-bold">-44 dBm</span>
                  </div>
                </div>
              )}

              {/* VIEW: WATERPROOF LED TAG SHOWCASE */}
              {view === 'waterproof-led' && (
                <div className="flex-1 p-4 flex flex-col justify-between bg-gradient-to-b from-sky-950/70 via-slate-900 to-slate-950">
                  <div className="flex items-center justify-between text-[11px] font-mono text-sky-300">
                    <span>IP68 WATERPROOF</span>
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                      WET ENV READY
                    </span>
                  </div>

                  <div className="my-auto flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <div className="w-24 h-16 rounded-2xl bg-sky-950/80 border-2 border-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.45)] flex items-center justify-center relative">
                        <div className="w-5 h-5 rounded-full bg-sky-400 animate-ping absolute top-2 right-2 opacity-75" />
                        <div className="w-4 h-4 rounded-full bg-sky-300 shadow-[0_0_16px_#38bdf8] absolute top-2.5 right-2.5" />
                        <Droplets className="w-8 h-8 text-sky-300" />
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-white">Waterproof LED Tag</h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-[235px] leading-relaxed">
                      Sealed rugged housing lights up identically in water, washdowns, and wet environments.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-sky-900/60 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-slate-400">Rating: IP68 Submersible</span>
                    <span className="text-sky-400 font-bold">LED OK</span>
                  </div>
                </div>
              )}

              {/* VIEW: SILENCE PAUSE (VIDEO B-ROLL BREATHER) */}
              {view === 'silence-pause' && (
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-slate-950">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-3">
                    <VolumeX className="w-6 h-6 text-amber-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Timed Silence Cue</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                    Clean 2-second visual pause for video cuts and transitions.
                  </p>
                </div>
              )}

              {/* VIEW: READER SETTINGS */}
              {view === 'reader-settings' && (
                <div className="flex-1 flex flex-col bg-slate-900">
                  <div className="bg-sky-950/80 px-3 py-2 border-b border-sky-800/40 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-white">UHR2 Reader Settings</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      RF Config
                    </span>
                  </div>

                  <div className="p-3 space-y-2.5 flex-1 overflow-y-auto text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-amber-500/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">RF Output Power</span>
                        <span className="font-mono font-bold text-amber-400">{antennaPower} dBm</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: '50%' }} />
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Frequency Band</span>
                      <span className="font-mono text-slate-200">UHF 865–928 MHz</span>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Tag Light / LED Mode</span>
                      <span className="font-mono text-emerald-400 font-semibold">Enabled (Gen2)</span>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Read Mode</span>
                      <span className="font-mono text-sky-400">Continuous</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: SCANNING / INVENTORY / RESULTS / CLEAR / LED SCANNING */}
              {(view === 'inventory-ready' ||
                view === 'scanning-active' ||
                view === 'scanned-results' ||
                view === 'clear-action' ||
                view === 'led-scanning' ||
                view === 'summary') && (
                <div className="flex-1 flex flex-col bg-slate-950">
                  {/* RFID App Bar */}
                  <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Radio className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-xs font-bold text-white">
                        {view === 'led-scanning' ? 'Menu > Live LED Read' : 'Inventory Test'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {view === 'led-scanning' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>LED BLINKING</span>
                        </span>
                      )}
                      {view !== 'led-scanning' && (
                        <button
                          onClick={handleClearTags}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1 transition-all ${
                            highlight === 'clear'
                              ? 'bg-rose-500 text-white font-bold ring-2 ring-rose-300 animate-pulse'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          title="Clear Tag Data"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Header */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-900/50 p-2 border-b border-slate-800/80 text-center font-mono">
                    <div className="bg-slate-950/70 p-1.5 rounded">
                      <span className="text-[9px] text-slate-400 block font-sans">Power</span>
                      <span className="text-xs font-bold text-amber-400">{antennaPower} dBm</span>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded">
                      <span className="text-[9px] text-slate-400 block font-sans">Unique EPCs</span>
                      <span className="text-xs font-bold text-sky-400">{scannedTags.length}</span>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded">
                      <span className="text-[9px] text-slate-400 block font-sans">Status</span>
                      <span
                        className={`text-xs font-bold ${
                          isScanning || triggerPulled ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
                        }`}
                      >
                        {isScanning || triggerPulled ? 'SCANNING' : 'STOPPED'}
                      </span>
                    </div>
                  </div>

                  {/* Scanned EPC Tag Table */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-[11px]">
                    {scannedTags.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                        <Trash2 className="w-6 h-6 mb-1 text-slate-600" />
                        <span className="font-medium">Tag buffer cleared</span>
                        <span className="text-[10px] text-slate-500">Pull trigger to resume reading</span>
                      </div>
                    ) : (
                      scannedTags.map((tag, idx) => (
                        <div
                          key={tag.epc}
                          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-1.5 rounded flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5">
                              {view === 'led-scanning' ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_6px_#34d399]" />
                              ) : (
                                <span className="w-4 text-[9px] text-slate-500 font-mono">#{idx + 1}</span>
                              )}
                              <span className="font-mono text-white text-[11px] font-semibold truncate">
                                {tag.epc}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono pl-5">
                              TID: {tag.tid}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-sky-400 font-mono block">
                              {tag.rssi} dBm
                            </span>
                            <span className="text-[9px] text-emerald-400 font-mono">
                              x{tag.count}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bottom Scan Trigger Bar */}
                  <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {isScanning ? 'Auto-reading RFID tags' : 'Ready to scan'}
                    </span>
                    <button
                      onClick={handleTriggerPress}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                        isScanning
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <span>{isScanning ? 'Stop Scan' : 'Start Scan'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Android Navigation Bar */}
            <div className="bg-slate-950 py-1.5 px-6 flex items-center justify-around border-t border-slate-800/80 text-slate-500">
              <span className="w-3 h-3 border-l-2 border-b-2 border-slate-500 transform -rotate-45" />
              <span className="w-3 h-3 rounded-full border-2 border-slate-500" />
              <span className="w-3 h-3 border-2 border-slate-500 rounded-sm" />
            </div>
          </div>

          {/* Bottom Pistol Grip & Physical Trigger Button */}
          <div className="mt-4 flex flex-col items-center">
            {/* Physical Trigger Callout */}
            <div className="relative">
              <button
                onClick={handleTriggerPress}
                className={`px-6 py-2 rounded-xl border-2 font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg active:scale-95 cursor-pointer ${
                  highlight === 'trigger' || isScanning
                    ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-105'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title="Pistol Grip Trigger"
              >
                <span>Trigger: {isScanning ? 'Pulling (Scanning)' : 'Ready'}</span>
              </button>

              {(highlight === 'trigger' || view === 'side-buttons') && (
                <div className="absolute -left-36 top-1 bg-amber-500 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded shadow-lg animate-bounce pointer-events-none">
                  Trigger Button
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Step Caption */}
      <div className="mt-4 text-center max-w-[340px]">
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-sky-400 border border-slate-700">
          <span>Step {currentSegment.stepNumber} of {totalSteps}</span>
          <span>•</span>
          <span className="text-white">{currentSegment.title}</span>
        </span>
      </div>
    </div>
  );
};
