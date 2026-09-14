import React, { useState, useRef } from "react";
import { Device, PerimeterZone, PerimeterType } from "../types";
import { CameraCanvas } from "./CameraCanvas";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";
import {
  Maximize2,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Sliders,
  Bell,
  Clock,
  Crosshair,
  UserCheck,
  Car,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";

interface PerimeterEditorProps {
  devices: Device[];
  perimeters: PerimeterZone[];
  onPerimeterCreated: (zone: PerimeterZone) => void;
  onPerimeterToggled: (zone: PerimeterZone) => void;
  onSimulateZoneAlert: (zone: PerimeterZone, dev: Device) => void;
}

export const PerimeterEditor: React.FC<PerimeterEditorProps> = ({
  devices,
  perimeters,
  onPerimeterCreated,
  onPerimeterToggled,
  onSimulateZoneAlert,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || "cam-01");
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  // Editor State
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoneName, setZoneName] = useState("Cerca Perimetral Leste");
  const [zoneType, setZoneType] = useState<PerimeterType>("INTRUSION_POLYGON");
  const [zoneColor, setZoneColor] = useState("#ef4444");
  const [sensitivity, setSensitivity] = useState(85);
  const [dwellTime, setDwellTime] = useState(2);
  const [selectedTargets, setSelectedTargets] = useState<Array<"HUMAN" | "VEHICLE" | "ANIMAL" | "UNATTENDED_OBJECT">>([
    "HUMAN",
    "VEHICLE",
  ]);
  const [selectedActions, setSelectedActions] = useState<Array<"SIREN" | "NOTIFY_GUARD" | "RECORD_HIGH_FPS" | "CLOUD_VAULT_LOCK">>([
    "SIREN",
    "NOTIFY_GUARD",
    "RECORD_HIGH_FPS",
  ]);
  const [tempPoints, setTempPoints] = useState<Array<{ x: number; y: number }>>([
    { x: 15, y: 35 },
    { x: 85, y: 30 },
    { x: 90, y: 80 },
    { x: 10, y: 85 },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Device zones
  const deviceZones = perimeters.filter((p) => p.deviceId === selectedDevice.id);

  // Toggle Target Filter
  const toggleTarget = (target: "HUMAN" | "VEHICLE" | "ANIMAL" | "UNATTENDED_OBJECT") => {
    if (selectedTargets.includes(target)) {
      if (selectedTargets.length > 1) {
        setSelectedTargets(selectedTargets.filter((t) => t !== target));
      }
    } else {
      setSelectedTargets([...selectedTargets, target]);
    }
  };

  // Toggle Alert Action
  const toggleAction = (action: "SIREN" | "NOTIFY_GUARD" | "RECORD_HIGH_FPS" | "CLOUD_VAULT_LOCK") => {
    if (selectedActions.includes(action)) {
      if (selectedActions.length > 1) {
        setSelectedActions(selectedActions.filter((a) => a !== action));
      }
    } else {
      setSelectedActions([...selectedActions, action]);
    }
  };

  // Handle click on canvas overlay to add point
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (zoneType === "TRIPWIRE_LINE" && tempPoints.length >= 2) {
      setTempPoints([{ x, y }]);
    } else {
      setTempPoints((prev) => [...prev, { x, y }]);
    }
    playAlarmSound("click");
  };

  const handleClearPoints = () => {
    setTempPoints([]);
  };

  const handleSaveZone = async () => {
    if (tempPoints.length < 2) {
      alert("Demarque ao menos 2 pontos na tela para configurar a zona.");
      return;
    }

    setIsLoading(true);
    try {
      const newZone = await api.createPerimeter({
        deviceId: selectedDevice.id,
        name: zoneName,
        type: zoneType,
        coordinates: tempPoints,
        color: zoneColor,
        sensitivity,
        dwellTimeSeconds: dwellTime,
        targetFilters: selectedTargets,
        alertActions: selectedActions,
      });

      onPerimeterCreated(newZone);
      setIsDrawing(false);
      playAlarmSound("ack");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar perímetro.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArm = async (zone: PerimeterZone) => {
    try {
      const updated = await api.togglePerimeter(zone.id);
      onPerimeterToggled(updated);
      playAlarmSound(updated.armed ? "ack" : "click");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">CONFIGURAÇÃO DE PERÍMETROS & TRIPWIRES</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Demarque polígonos de invasão, cercas virtuais e linhas de cruzamento diretamente sobre os fluxos de vídeo.
          </p>
        </div>

        {/* Camera Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">Câmera:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              setIsDrawing(false);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Workspace: Canvas on Left, Zone Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Preview & Interactive Zone Overlay */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
            {/* The Live Video Feed Canvas */}
            <CameraCanvas
              device={selectedDevice}
              zones={deviceZones}
              aiBoundingBoxes={true}
              privacyMasking={true}
            />

            {/* Interactive Drawing Overlay */}
            <div
              ref={overlayRef}
              onClick={handleOverlayClick}
              className={`absolute inset-0 z-20 ${isDrawing ? "cursor-crosshair bg-cyan-950/10" : "pointer-events-none"}`}
            >
              {/* If drawing, show SVG temporary points & lines */}
              {isDrawing && (
                <svg className="w-full h-full">
                  {tempPoints.length > 1 && (
                    <polyline
                      points={tempPoints.map((p) => `${p.x}%,${p.y}%`).join(" ")}
                      fill={zoneType === "TRIPWIRE_LINE" ? "none" : `${zoneColor}33`}
                      stroke={zoneColor}
                      strokeWidth="3"
                      strokeDasharray="6 4"
                    />
                  )}
                  {tempPoints.map((p, i) => (
                    <circle
                      key={i}
                      cx={`${p.x}%`}
                      cy={`${p.y}%`}
                      r="6"
                      fill="#ffffff"
                      stroke={zoneColor}
                      strokeWidth="3"
                    />
                  ))}
                </svg>
              )}

              {/* Drawing helper message */}
              {isDrawing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-cyan-500 text-cyan-300 text-xs px-4 py-1.5 rounded-full shadow-lg font-mono flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 animate-spin" />
                  <span>Clique no vídeo para adicionar vértices ({tempPoints.length} pontos demarcados)</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Drawing Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2">
              {!isDrawing ? (
                <button
                  onClick={() => {
                    setIsDrawing(true);
                    setTempPoints([]);
                  }}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Demarcar Novo Perímetro</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveZone}
                    disabled={isLoading || tempPoints.length < 2}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir e Salvar Zona</span>
                  </button>
                  <button
                    onClick={handleClearPoints}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
                  >
                    Limpar Pontos
                  </button>
                  <button
                    onClick={() => setIsDrawing(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl transition"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              {deviceZones.length} regras ativas para {selectedDevice.name}
            </span>
          </div>

          {/* Active Configured Zones for this Device */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono text-slate-400 uppercase font-semibold">Perímetros Armados no Canal:</h4>
            {deviceZones.length === 0 ? (
              <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500">
                Nenhum perímetro ativo configurado para esta câmera. Clique em "Demarcar Novo Perímetro" para desenhar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deviceZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                        <div>
                          <h5 className="text-xs font-bold text-white">{zone.name}</h5>
                          <span className="text-[10px] font-mono text-cyan-400">{zone.type}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleArm(zone)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                          zone.armed
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        {zone.armed ? "ARMADO" : "DESARMADO"}
                      </button>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex justify-between">
                        <span>Sensibilidade:</span>
                        <span className="text-slate-200">{zone.sensitivity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tempo de Permanência:</span>
                        <span className="text-slate-200">{zone.dwellTimeSeconds}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Alvos Monitorados:</span>
                        <span className="text-cyan-300">{zone.targetFilters.join(", ")}</span>
                      </div>
                    </div>

                    {/* Test Trigger Button */}
                    <button
                      onClick={() => onSimulateZoneAlert(zone, selectedDevice)}
                      className="w-full py-1.5 bg-red-600/15 hover:bg-red-600/25 border border-red-600/30 text-red-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Testar Disparo desta Zona</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Perimeter Rules & Parameters Panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parâmetros de Detecção</h3>
          </div>

          {/* Zone Name */}
          <div>
            <label className="block text-xs text-slate-300 mb-1">Nome da Zona:</label>
            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
            />
          </div>

          {/* Perimeter Type */}
          <div>
            <label className="block text-xs text-slate-300 mb-1">Tipo de Barreira Virtual:</label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
            >
              <option value="INTRUSION_POLYGON">Polígono de Intrusão (Área Restrita)</option>
              <option value="TRIPWIRE_LINE">Linha Virtual (Tripwire / Cruzamento)</option>
              <option value="LOITERING_ZONE">Zona de Permanência Suspeita (Loitering)</option>
              <option value="DIRECTIONAL_FLOW">Fluxo Direcional (Sentido Proibido)</option>
            </select>
          </div>

          {/* Color Preset */}
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">Cor de Demarcação:</label>
            <div className="flex items-center gap-2">
              {[
                { hex: "#ef4444", name: "Vermelho Alarme" },
                { hex: "#f59e0b", name: "Âmbar Alerta" },
                { hex: "#8b5cf6", name: "Roxo Crítico" },
                { hex: "#06b6d4", name: "Ciano Técnico" },
                { hex: "#10b981", name: "Verde Perímetro" },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setZoneColor(c.hex)}
                  className={`w-7 h-7 rounded-full transition ${
                    zoneColor === c.hex ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "opacity-80"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Sensitivity Slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Sensibilidade da Rede Neural:</span>
              <span className="font-mono text-cyan-400 font-bold">{sensitivity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="99"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
              <span>Baixa (Menos falsos positivos)</span>
              <span>Alta (Máxima detecção)</span>
            </div>
          </div>

          {/* Dwell Time */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Tempo de Permanência (Dwell Time):</span>
              <span className="font-mono text-cyan-400 font-bold">{dwellTime}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={dwellTime}
              onChange={(e) => setDwellTime(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Dispara o alarme apenas se o alvo permanecer na área por mais de {dwellTime} segundos.
            </span>
          </div>

          {/* Target Filters */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Filtragem de Alvos (IA):</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleTarget("HUMAN")}
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition ${
                  selectedTargets.includes("HUMAN")
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Pessoas</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTarget("VEHICLE")}
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition ${
                  selectedTargets.includes("VEHICLE")
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Veículos</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTarget("UNATTENDED_OBJECT")}
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition ${
                  selectedTargets.includes("UNATTENDED_OBJECT")
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Objetos</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTarget("ANIMAL")}
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition ${
                  selectedTargets.includes("ANIMAL")
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Animais</span>
              </button>
            </div>
          </div>

          {/* Automated Alert Actions */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Ações Automatizadas no Disparo:</label>
            <div className="space-y-2 text-xs">
              {[
                { id: "SIREN", label: "Acionar Sirene Sonora de Alta Dissuasão" },
                { id: "NOTIFY_GUARD", label: "Despachar Alerta aos Guardas de Ronda" },
                { id: "RECORD_HIGH_FPS", label: "Gravação Imediata em 60 FPS (Burst)" },
                { id: "CLOUD_VAULT_LOCK", label: "Arquivar Evidência em Cofre WORM Imutável" },
              ].map((act) => (
                <label key={act.id} className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(act.id as any)}
                    onChange={() => toggleAction(act.id as any)}
                    className="rounded accent-cyan-500"
                  />
                  <span>{act.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
