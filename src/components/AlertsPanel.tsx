import React, { useState } from "react";
import { SecurityAlert, Device } from "../types";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";
import {
  Bell,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Clock,
  Camera,
  Cpu,
  Lock,
  Volume2,
  ExternalLink,
  Flame,
  Search,
  Filter,
} from "lucide-react";

interface AlertsPanelProps {
  alerts: SecurityAlert[];
  devices: Device[];
  onAlertAcknowledged: (alert: SecurityAlert) => void;
  onSimulateIntrusion: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  devices,
  onAlertAcknowledged,
  onSimulateIntrusion,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(alerts[0] || null);
  const [ackOperator, setAckOperator] = useState("Operador Central (SOC)");
  const [isAcking, setIsAcking] = useState(false);

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === "ALL") return true;
    if (filterSeverity === "UNACKNOWLEDGED") return !a.acknowledged;
    return a.severity === filterSeverity;
  });

  const handleAcknowledge = async (alertItem: SecurityAlert) => {
    setIsAcking(true);
    try {
      const updated = await api.acknowledgeAlert(alertItem.id, ackOperator);
      onAlertAcknowledged(updated);
      setSelectedAlert(updated);
      playAlarmSound("ack");
    } catch (err: any) {
      console.error("Erro ao reconhecer alarme:", err);
    } finally {
      setIsAcking(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-500 animate-bounce" />
            <h2 className="text-lg font-bold text-white font-mono">CENTRAL DE ALARMES & INTRUSÕES EM TEMPO REAL</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recepção instantânea de eventos de quebra de perímetro, movimento hostil, vadiagem e sabotagem com evidência fotográfica assina digitalmente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSimulateIntrusion}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 transition"
          >
            <Flame className="w-4 h-4" />
            <span>Disparar Alarme de Teste</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: `Todos (${alerts.length})` },
          { id: "UNACKNOWLEDGED", label: `Não Reconhecidos (${alerts.filter((a) => !a.acknowledged).length})` },
          { id: "CRITICAL", label: "Críticos" },
          { id: "HIGH", label: "Altos" },
          { id: "MEDIUM", label: "Médios" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterSeverity(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition whitespace-nowrap ${
              filterSeverity === f.id
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Alert Grid: Feed List on Left, Forensic Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts Feed List */}
        <div className="lg:col-span-6 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
              Nenhum evento registrado no filtro selecionado.
            </div>
          ) : (
            filteredAlerts.map((alt) => {
              const isSelected = selectedAlert?.id === alt.id;
              const isCritical = alt.severity === "CRITICAL";

              return (
                <div
                  key={alt.id}
                  onClick={() => {
                    setSelectedAlert(alt);
                    playAlarmSound("click");
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                  } ${!alt.acknowledged && isCritical ? "border-red-500/60 bg-red-950/10" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          alt.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                            : alt.severity === "HIGH"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        }`}
                      >
                        {alt.severity}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{alt.type}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(alt.timestamp).toLocaleTimeString("pt-BR")}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{alt.description}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">{alt.deviceName}</span>
                    {alt.acknowledged ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Reconhecido
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 animate-ping" /> PENDENTE
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Forensic Detail Inspector */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          {selectedAlert ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold">EVENTO #{selectedAlert.id}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(selectedAlert.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{selectedAlert.description}</h3>
                  <p className="text-xs text-slate-400">{selectedAlert.deviceName} • {selectedAlert.zoneName}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-cyan-400 block">
                    {(selectedAlert.confidence * 100).toFixed(0)}% Confiança IA
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Alvo: {selectedAlert.targetType}</span>
                </div>
              </div>

              {/* Simulated Forensic Frame Snapshot */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                {/* SVG Forensic Target Render */}
                <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-b from-slate-950 to-slate-900">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>EVIDÊNCIA FOTOGRÁFICA REGISTRADA</span>
                    <span className="text-cyan-400">ALGORITMO RESNET-NPU</span>
                  </div>

                  {/* Forensic Box */}
                  <div className="relative w-48 h-36 mx-auto border-2 border-red-500 rounded-lg bg-red-500/10 flex flex-col items-center justify-center text-center p-2 shadow-lg shadow-red-500/20">
                    <ShieldAlert className="w-8 h-8 text-red-400 mb-1 animate-pulse" />
                    <span className="text-xs font-bold text-white font-mono">{selectedAlert.targetType} DETECTADO</span>
                    <span className="text-[10px] text-red-300 font-mono">BBox: x:{selectedAlert.boundingBox?.x}% y:{selectedAlert.boundingBox?.y}%</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                    <span>SELO LGPD: ANONIMIZADO</span>
                    <span className="text-sky-400">CRIPTOGRAFADO SHA-256</span>
                  </div>
                </div>
              </div>

              {/* AI Neural Analysis text */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono">
                  <Cpu className="w-4 h-4" />
                  <span>Análise Pericial da Inteligência Artificial:</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedAlert.aiAnalysis}</p>
              </div>

              {/* SHA-256 Chain Seal */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Assinatura Digital de Integridade (SHA-256):</span>
                </div>
                <p className="text-cyan-300 break-all select-all">{selectedAlert.integrityHash}</p>
              </div>

              {/* Acknowledgment Action Box */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                {selectedAlert.acknowledged ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs w-full flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Reconhecido por: {selectedAlert.acknowledgedBy}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[11px] text-slate-400 mb-1">Operador Responsável:</label>
                      <input
                        type="text"
                        value={ackOperator}
                        onChange={(e) => setAckOperator(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      onClick={() => handleAcknowledge(selectedAlert)}
                      disabled={isAcking}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isAcking ? "Processando..." : "Reconhecer Alarme"}</span>
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Selecione um alerta à esquerda para inspecionar os detalhes periciais.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
