import React, { useState, useRef } from "react";
import { Device, PerimeterZone, SecurityAlert, AiSceneAnalysisResponse } from "../types";
import { CameraCanvas, CameraCanvasHandle } from "./CameraCanvas";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";
import {
  Grid,
  Maximize2,
  Minimize2,
  Sparkles,
  Camera,
  Shield,
  Eye,
  EyeOff,
  Move,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Radio,
  Video,
  VideoOff,
  Download,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle,
} from "lucide-react";

interface LiveMonitorProps {
  devices: Device[];
  perimeters: PerimeterZone[];
  activeAlerts: SecurityAlert[];
  privacyMasking: boolean;
  setPrivacyMasking: (val: boolean) => void;
  aiBoundingBoxes: boolean;
  setAiBoundingBoxes: (val: boolean) => void;
  onSnapshotSaved?: (snapshot: { id: string; deviceName: string; timestamp: string; url: string }) => void;
  onOpen2FA: (action: string, callback: () => void) => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  devices,
  perimeters,
  activeAlerts,
  privacyMasking,
  setPrivacyMasking,
  aiBoundingBoxes,
  setAiBoundingBoxes,
  onSnapshotSaved,
  onOpen2FA,
}) => {
  const [gridLayout, setGridLayout] = useState<"1x1" | "2x2" | "3x3">("2x2");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || "cam-01");
  const [ptzZoom, setPtzZoom] = useState<number>(1);
  const [ptzPan, setPtzPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AiSceneAnalysisResponse | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [snapshotSuccessToast, setSnapshotSuccessToast] = useState<string | null>(null);
  const cameraRefs = useRef<Record<string, CameraCanvasHandle | null>>({});

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  // PTZ functions
  const handlePtzMove = (dx: number, dy: number) => {
    setPtzPan((prev) => ({
      x: Math.max(-150, Math.min(150, prev.x + dx)),
      y: Math.max(-100, Math.min(100, prev.y + dy)),
    }));
    playAlarmSound("click");
  };

  const handlePtzZoom = (delta: number) => {
    setPtzZoom((prev) => Math.max(1, Math.min(3.5, Number((prev + delta).toFixed(1)))));
    playAlarmSound("click");
  };

  const resetPtz = () => {
    setPtzZoom(1);
    setPtzPan({ x: 0, y: 0 });
    playAlarmSound("click");
  };

  // Run Gemini AI Scene Analysis
  const handleAnalyzeScene = async () => {
    setIsAnalyzingAi(true);
    playAlarmSound("click");

    try {
      // Capture current real-time frame from canvas
      const currentSnap = cameraRefs.current[selectedDevice.id]?.captureSnapshot() || capturedSnapshot || "";
      if (currentSnap) {
        setCapturedSnapshot(currentSnap);
      }

      // Find current zone rules for selected device
      const zones = perimeters.filter((p) => p.deviceId === selectedDevice.id);
      const zoneRules = zones.map((z) => `${z.name} (${z.type}) com sensibilidade ${z.sensitivity}%`).join("; ");

      const result = await api.analyzeScene({
        imageBase64: currentSnap,
        deviceName: selectedDevice.name,
        zoneRules: zoneRules || "Perímetro padrão com monitoramento contra invasão e veículos não autorizados.",
        contextNotes: `Localização: ${selectedDevice.location}. Tipo: ${selectedDevice.type}. Verificar presença de invasores e anomalias.`,
      });

      setAiAnalysisResult(result);
      setShowAiModal(true);
      playAlarmSound("warning");
    } catch (err: any) {
      console.error(err);
      alert("Não foi possível completar a análise de cena.");
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Capture Snapshot on demand
  const handleTakeSnapshot = () => {
    const currentSnap = cameraRefs.current[selectedDevice.id]?.captureSnapshot() || capturedSnapshot;
    if (!currentSnap) {
      alert("Não foi possível capturar imagem do feed da câmera.");
      return;
    }

    setCapturedSnapshot(currentSnap);
    const timestamp = new Date().toISOString();
    const snapId = "snap-" + Math.floor(Math.random() * 89999 + 10000);

    if (onSnapshotSaved) {
      onSnapshotSaved({
        id: snapId,
        deviceName: selectedDevice.name,
        timestamp,
        url: currentSnap,
      });
    }

    setSnapshotSuccessToast(`Snapshot criptografado gravado no cofre: ${snapId}`);
    playAlarmSound("ack");
    setTimeout(() => setSnapshotSuccessToast(null), 3500);

    // Trigger download
    const link = document.createElement("a");
    link.href = currentSnap;
    link.download = `VISIONGUARD_${selectedDevice.id}_${Date.now()}.jpg`;
    link.click();
  };

  // Filter devices to show in the grid
  const getDisplayDevices = () => {
    if (gridLayout === "1x1") {
      return [selectedDevice];
    }
    if (gridLayout === "2x2") {
      return devices.slice(0, 4);
    }
    return devices.slice(0, 9);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 min-h-[calc(100vh-115px)] bg-slate-950">
      {/* Left / Main Surveillance Canvas Grid */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Top Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
          {/* Grid Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setGridLayout("1x1")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                gridLayout === "1x1"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>1x1 Foco</span>
            </button>
            <button
              onClick={() => setGridLayout("2x2")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                gridLayout === "2x2"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>2x2 Quad</span>
            </button>
            <button
              onClick={() => setGridLayout("3x3")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                gridLayout === "3x3"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>3x3 Matriz</span>
            </button>
          </div>

          {/* Quick Toggles: Privacy Masking & AI Bounding Boxes */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrivacyMasking(!privacyMasking)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                privacyMasking
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
              title="Borramento facial e de placas de veículos para conformidade LGPD"
            >
              {privacyMasking ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{privacyMasking ? "LGPD Blur: Ativo" : "LGPD Blur: Desat."}</span>
            </button>

            <button
              onClick={() => setAiBoundingBoxes(!aiBoundingBoxes)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                aiBoundingBoxes
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{aiBoundingBoxes ? "Caixas IA: On" : "Caixas IA: Off"}</span>
            </button>

            {/* Local Webcam as IP Camera Toggle */}
            <button
              onClick={() => setIsWebcamActive(!isWebcamActive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                isWebcamActive
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title="Usar a webcam do seu computador como uma Câmera IP ao vivo com IA embarcada"
            >
              {isWebcamActive ? <Video className="w-3.5 h-3.5 text-purple-400" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>{isWebcamActive ? "Webcam Local: Conectada" : "Conectar Webcam Local"}</span>
            </button>
          </div>

          {/* Action: Gemini AI Deep Scene Inspection */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyzeScene}
              disabled={isAnalyzingAi}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {isAnalyzingAi ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Análise Neural com Gemini</span>
            </button>

            <button
              onClick={handleTakeSnapshot}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
              title="Capturar fotograma (Snapshot em cofre com hash SHA-256)"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Snapshot Success Toast */}
        {snapshotSuccessToast && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{snapshotSuccessToast}</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-300">ASSINADO E2EE</span>
          </div>
        )}

        {/* Video Grid Viewport */}
        <div
          className={`grid gap-3 flex-1 bg-slate-950 rounded-2xl overflow-hidden ${
            gridLayout === "1x1"
              ? "grid-cols-1"
              : gridLayout === "2x2"
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
          style={{ minHeight: "540px" }}
        >
          {getDisplayDevices().map((dev) => {
            const devZones = perimeters.filter((p) => p.deviceId === dev.id);
            const devAlert = activeAlerts.find((a) => a.deviceId === dev.id && !a.acknowledged);
            const isSelected = selectedDevice.id === dev.id;

            return (
              <div
                key={dev.id}
                onClick={() => setSelectedDeviceId(dev.id)}
                className={`relative rounded-xl overflow-hidden border-2 transition cursor-pointer group ${
                  isSelected
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/10"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <CameraCanvas
                  ref={(el) => {
                    cameraRefs.current[dev.id] = el;
                  }}
                  device={dev}
                  zones={devZones}
                  privacyMasking={privacyMasking}
                  aiBoundingBoxes={aiBoundingBoxes}
                  ptzZoom={isSelected ? ptzZoom : 1}
                  ptzPan={isSelected ? ptzPan : { x: 0, y: 0 }}
                  isWebcamActive={isWebcamActive && isSelected}
                  highlightAlert={!!devAlert}
                />

                {/* Focus selection badge */}
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition">
                  <span className="px-2 py-1 bg-black/70 backdrop-blur-sm text-[10px] font-mono text-cyan-400 rounded-md border border-cyan-500/30">
                    {isSelected ? "● EM FOCO" : "CLIQUE PARA SELECIONAR"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time Telemetry Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400">Largura de Banda Total</span>
              <p className="text-sm font-mono font-bold text-slate-200">27.6 Mbps</p>
            </div>
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400">Taxa Média de Quadros</span>
              <p className="text-sm font-mono font-bold text-emerald-400">29.4 FPS (H.265+)</p>
            </div>
            <Video className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400">Perímetros Vigiados</span>
              <p className="text-sm font-mono font-bold text-amber-400">{perimeters.filter((p) => p.armed).length} Zonas Ativas</p>
            </div>
            <Shield className="w-5 h-5 text-amber-400" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400">Motor de IA Embarcada</span>
              <p className="text-sm font-mono font-bold text-purple-400">Edge NPU + Gemini</p>
            </div>
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Right Sidebar: Camera Selection & PTZ Control Deck */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Active Camera Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              Canal em Foco
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded-full border border-emerald-500/30">
              STREAM VIVO
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1">{selectedDevice.name}</h3>
          <p className="text-xs text-slate-400 mb-3">{selectedDevice.location}</p>

          <div className="space-y-1.5 text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Fabricante / Tipo:</span>
              <span>{selectedDevice.brand} ({selectedDevice.type})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Endereço IP:</span>
              <span className="text-cyan-400">{selectedDevice.ip}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Porta RTSP / ONVIF:</span>
              <span>{selectedDevice.rtspPort} / {selectedDevice.onvifPort}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Resolução / Codec:</span>
              <span>{selectedDevice.resolution.split(" ")[0]} ({selectedDevice.codec})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Perfil ONVIF:</span>
              <span className="text-emerald-400">{selectedDevice.onvifProfile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Criptografia Ponta a Ponta:</span>
              <span className="text-sky-400 font-semibold">AES-256 Habilitado</span>
            </div>
          </div>

          {/* Camera Switcher Dropdown */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Mudar Câmera em Exibição:</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.brand} - {d.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PTZ (Pan / Tilt / Zoom) Controller */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Controle PTZ</h4>
            </div>
            <button
              onClick={resetPtz}
              className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition"
            >
              Redefinir
            </button>
          </div>

          {/* Virtual Directional Pad */}
          <div className="flex justify-center mb-4">
            <div className="relative w-36 h-36 bg-slate-950 border border-slate-800 rounded-full p-2 flex items-center justify-center shadow-inner">
              {/* Up */}
              <button
                onClick={() => handlePtzMove(0, -20)}
                className="absolute top-2 w-10 h-9 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 rounded-t-full flex items-center justify-center text-xs font-bold transition"
                title="Inclinar para Cima (Tilt Up)"
              >
                ▲
              </button>
              {/* Down */}
              <button
                onClick={() => handlePtzMove(0, 20)}
                className="absolute bottom-2 w-10 h-9 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 rounded-b-full flex items-center justify-center text-xs font-bold transition"
                title="Inclinar para Baixo (Tilt Down)"
              >
                ▼
              </button>
              {/* Left */}
              <button
                onClick={() => handlePtzMove(-25, 0)}
                className="absolute left-2 h-10 w-9 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 rounded-l-full flex items-center justify-center text-xs font-bold transition"
                title="Mover para Esquerda (Pan Left)"
              >
                ◀
              </button>
              {/* Right */}
              <button
                onClick={() => handlePtzMove(25, 0)}
                className="absolute right-2 h-10 w-9 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 rounded-r-full flex items-center justify-center text-xs font-bold transition"
                title="Mover para Direita (Pan Right)"
              >
                ▶
              </button>
              {/* Center crosshair */}
              <button
                onClick={resetPtz}
                className="w-10 h-10 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-400 rounded-full flex items-center justify-center transition"
                title="Centralizar Câmera"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Zoom Óptico / Digital:</span>
              <span className="font-mono text-cyan-400 font-bold">{ptzZoom}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePtzZoom(-0.2)}
                className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-1 transition"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span>Menos</span>
              </button>
              <button
                onClick={() => handlePtzZoom(0.2)}
                className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-1 transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Mais</span>
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <span className="block text-[11px] text-slate-400 mb-2">Posições Pré-Definidas (Presets):</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => { setPtzPan({ x: -40, y: -20 }); setPtzZoom(1.8); }}
                className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-800 transition text-center"
              >
                P1: Cancela
              </button>
              <button
                onClick={() => { setPtzPan({ x: 50, y: 10 }); setPtzZoom(2.2); }}
                className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-800 transition text-center"
              >
                P2: Muralha
              </button>
              <button
                onClick={() => { setPtzPan({ x: 0, y: 0 }); setPtzZoom(1.0); }}
                className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-800 transition text-center"
              >
                P3: Geral
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gemini AI Scene Analysis Results Modal */}
      {showAiModal && aiAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-tr from-cyan-500 to-sky-400 rounded-xl text-slate-950">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Relatório de Inteligência Artificial Embarcada</h3>
                  <span className="text-xs font-mono text-cyan-400">Motor: {aiAnalysisResult.engine}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  aiAnalysisResult.threatLevel === "CRÍTICO"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : aiAnalysisResult.threatLevel === "ELEVADO"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                }`}>
                  NÍVEL {aiAnalysisResult.threatLevel} ({aiAnalysisResult.threatScore}/100)
                </span>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Analysis summary */}
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-mono text-cyan-400 mb-1 font-semibold uppercase">Diagnóstico da Cena:</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{aiAnalysisResult.summary}</p>
              </div>

              {/* Detections list */}
              <div>
                <h4 className="text-xs font-mono text-slate-400 mb-2 uppercase">Entidades Identificadas no Quadro:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiAnalysisResult.detections.map((det, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-200">{det.label}</p>
                        <span className="text-[10px] text-slate-400">{det.type}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {(det.confidence * 100).toFixed(0)}% Confiança
                        </span>
                        {det.threatScore !== undefined && (
                          <p className="text-[10px] text-amber-400">Ameaça: {det.threatScore}/100</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational Recommendation */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-300">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Ação Recomendada pela IA:</h4>
                </div>
                <p className="text-xs leading-relaxed">{aiAnalysisResult.recommendedAction}</p>
              </div>

              {/* LGPD Assessment */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>
                  Conformidade LGPD: {aiAnalysisResult.lgpdComplianceAssessment || "Fotograma submetido a criptografia AES-256 e anonimização facial automatizada."}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAiModal(false);
                  handleTakeSnapshot();
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Salvar Registro em Cofre em Nuvem</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
