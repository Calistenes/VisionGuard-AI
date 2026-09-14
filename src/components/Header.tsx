import React from "react";
import {
  ShieldAlert,
  Camera,
  Server,
  Maximize2,
  Bell,
  HardDrive,
  FileCheck,
  ShieldCheck,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Lock,
  Flame,
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  audioMuted: boolean;
  setAudioMuted: (muted: boolean) => void;
  unacknowledgedAlertsCount: number;
  onSimulateIntrusion: () => void;
  onOpen2FAModal: () => void;
  is2FAVerified: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  audioMuted,
  setAudioMuted,
  unacknowledgedAlertsCount,
  onSimulateIntrusion,
  onOpen2FAModal,
  is2FAVerified,
}) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: "monitor", label: "Mural Ao Vivo", icon: Camera },
    { id: "devices", label: "Dispositivos (DVR/NVR/IP)", icon: Server },
    { id: "perimeters", label: "Perímetros & Zonas", icon: Maximize2 },
    { id: "alerts", label: "Central de Alarmes", icon: Bell, badge: unacknowledgedAlertsCount },
    { id: "cloud", label: "Nuvem & Gravações", icon: HardDrive },
    { id: "audit", label: "Auditoria & Logs", icon: FileCheck },
    { id: "lgpd", label: "Conformidade LGPD", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Banner Status Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 text-xs border-b border-slate-900 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold tracking-wider">SOC ONLINE</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>IA: <strong className="text-slate-200">Gemini 3.8 Flash + NPU Edge</strong></span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span>Criptografia: <strong className="text-slate-200">AES-256-GCM E2EE</strong></span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>LGPD: <strong className="text-slate-200">Art. 7º IX (Segurança)</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick 2FA status button */}
          <button
            onClick={onOpen2FAModal}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono transition ${
              is2FAVerified
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
            title="Autenticação em 2 Fatores (TOTP)"
          >
            <Lock className="w-3 h-3" />
            <span>{is2FAVerified ? "2FA VERIFICADO" : "VALIDAR 2FA"}</span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className={`p-1.5 rounded-lg border transition ${
              audioMuted
                ? "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
            }`}
            title={audioMuted ? "Sirene Silenciada" : "Sirene Ativa"}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Clock */}
          <div className="font-mono text-cyan-400 text-[11px] tracking-wide bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {time.toLocaleTimeString("pt-BR")} BRT
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-4 py-2.5 gap-3">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("monitor")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white font-mono">VISIONGUARD</h1>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded">
                  AI PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">Videomonitoramento & Perímetro Inteligente</p>
            </div>
          </div>

          {/* Quick Simulation Trigger button on Mobile */}
          <div className="md:hidden">
            <button
              onClick={onSimulateIntrusion}
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Testar Invasão</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all relative ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full font-mono animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Emergency Simulate Intrusion Action Button on Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onSimulateIntrusion}
            className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95"
            title="Disparar simulação de intrusão perimétrica para teste de resposta da IA"
          >
            <Flame className="w-4 h-4 animate-bounce" />
            <span>Simular Invasão Perímetro</span>
          </button>
        </div>
      </div>
    </header>
  );
};
