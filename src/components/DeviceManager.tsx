import React, { useState } from "react";
import { Device, DeviceType } from "../types";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";
import {
  Server,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Lock,
  Trash2,
  Edit2,
  RefreshCw,
  Video,
  Shield,
  Layers,
  Cpu,
  Eye,
  Sliders,
  X,
} from "lucide-react";

interface DeviceManagerProps {
  devices: Device[];
  onDeviceCreated: (newDev: Device) => void;
  onDeviceUpdated: (updatedDev: Device) => void;
  onDeviceDeleted: (id: string) => void;
  onOpen2FA: (action: string, callback: () => void) => void;
}

const BRAND_OPTIONS = [
  "Intelbras",
  "Hikvision",
  "Dahua Technology",
  "Axis Communications",
  "Bosch Security",
  "Uniview",
  "Hanwha Vision",
  "Pelco",
  "Generic ONVIF",
];

const DEVICE_TYPES: { type: DeviceType; label: string; desc: string }[] = [
  { type: "IP_CAMERA", label: "Câmera IP (Bullet / Dome)", desc: "Fluxo direto via RTSP/ONVIF Profile S/T com IA embarcada" },
  { type: "DVR", label: "DVR (Gravador Analógico / Multi-HD)", desc: "Multiplexador de canais BNC analógicos / HDCVI / AHD" },
  { type: "NVR", label: "NVR (Gravador de Vídeo em Rede)", desc: "Gerenciador centralizado de múltiplos canais IP" },
  { type: "PTZ_CAMERA", label: "Câmera PTZ Speed Dome", desc: "Controle motorizado de Pan, Tilt, Zoom óptico contínuo" },
  { type: "THERMAL_CAMERA", label: "Câmera Termográfica", desc: "Sensor radiométrico infravermelho de longo alcance" },
  { type: "BODY_CAM", label: "BodyCam / Câmera Móvel", desc: "Transmissão 4G/5G com GPS e gravação em campo" },
];

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  devices,
  onDeviceCreated,
  onDeviceUpdated,
  onDeviceDeleted,
  onOpen2FA,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScanningOnvif, setIsScanningOnvif] = useState(false);
  const [scanResults, setScanResults] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<DeviceType>("IP_CAMERA");
  const [brand, setBrand] = useState("Intelbras");
  const [model, setModel] = useState("VIP 3230 B Full Color");
  const [ip, setIp] = useState("192.168.1.120");
  const [rtspPort, setRtspPort] = useState(554);
  const [httpPort, setHttpPort] = useState(80);
  const [onvifPort, setOnvifPort] = useState(8899);
  const [channelCount, setChannelCount] = useState(1);
  const [location, setLocation] = useState("Portão Sul / Acesso Secundário");
  const [resolution, setResolution] = useState("1920x1080 (Full HD)");
  const [codec, setCodec] = useState<"H.265+" | "H.264" | "AV1">("H.265+");
  const [feedSimulationType, setFeedSimulationType] = useState<Device["feedSimulationType"]>("entrance");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered devices list
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ip.includes(searchTerm) ||
      d.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || d.type === filterType;
    return matchesSearch && matchesType;
  });

  // Handle ONVIF Discovery scan
  const handleOnvifScan = () => {
    setIsScanningOnvif(true);
    playAlarmSound("click");
    setScanResults([]);

    setTimeout(() => {
      setIsScanningOnvif(false);
      setScanResults([
        {
          ip: "192.168.1.140",
          brand: "Intelbras",
          model: "VIP 3430 D AI",
          type: "IP_CAMERA",
          mac: "3C:83:70:A2:33:01",
          onvifPort: 8899,
          profile: "Profile T / S",
        },
        {
          ip: "192.168.1.141",
          brand: "Hikvision",
          model: "DS-7616NI-K2/16P",
          type: "NVR",
          mac: "44:19:B6:77:E1:92",
          onvifPort: 80,
          profile: "Profile G / S",
        },
      ]);
      playAlarmSound("ack");
    }, 1800);
  };

  const handleApplyDiscovered = (item: any) => {
    setName(`${item.brand} ${item.model} (${item.ip})`);
    setType(item.type);
    setBrand(item.brand);
    setModel(item.model);
    setIp(item.ip);
    setOnvifPort(item.onvifPort);
    setIsCreateModalOpen(true);
  };

  // Submit device creation with 2FA protection check
  const handleSubmitDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ip) {
      setError("Preencha o nome e o endereço IP do dispositivo.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newDev = await api.createDevice({
        name,
        type,
        brand,
        model,
        ip,
        rtspPort,
        httpPort,
        onvifPort,
        channelCount,
        location,
        resolution,
        codec,
        feedSimulationType,
      });

      onDeviceCreated(newDev);
      setIsCreateModalOpen(false);
      playAlarmSound("ack");
      resetForm();
    } catch (err: any) {
      setError(err.message || "Erro ao registrar dispositivo.");
      playAlarmSound("warning");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setIp("192.168.1.120");
    setLocation("Área Perimetral");
    setChannelCount(1);
  };

  // Delete with 2FA
  const handleDeleteDevice = (dev: Device) => {
    onOpen2FA(`Remoção do dispositivo ${dev.name}`, async () => {
      try {
        await api.deleteDevice(dev.id);
        onDeviceDeleted(dev.id);
        playAlarmSound("ack");
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">CADASTRO UNIFICADO DE DISPOSITIVOS</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Suporte a DVRs, NVRs, Câmeras IP (Bullet/Dome), Speed Domes PTZ, Câmeras Térmicas e BodyCams com ONVIF Profile S/G/T.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOnvifScan}
            disabled={isScanningOnvif}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScanningOnvif ? "animate-spin" : ""}`} />
            <span>{isScanningOnvif ? "Varrendo Rede ONVIF..." : "Varredura ONVIF LAN"}</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Dispositivo</span>
          </button>
        </div>
      </div>

      {/* Discovered ONVIF Devices Banner (if scanned) */}
      {scanResults.length > 0 && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 text-slate-200 animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono uppercase">
              <Radio className="w-4 h-4 animate-ping" />
              <span>{scanResults.length} Dispositivos ONVIF Encontrados na Rede Local:</span>
            </div>
            <button
              onClick={() => setScanResults([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scanResults.map((item, idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{item.brand} {item.model}</p>
                  <p className="text-[11px] font-mono text-slate-400">IP: {item.ip} • MAC: {item.mac} ({item.profile})</p>
                </div>
                <button
                  onClick={() => handleApplyDiscovered(item)}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition"
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, IP, marca ou local..."
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter by Type */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "IP_CAMERA", "DVR", "NVR", "PTZ_CAMERA", "THERMAL_CAMERA"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition whitespace-nowrap ${
                filterType === t
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {t === "ALL" ? "Todos (" + devices.length + ")" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((dev) => (
          <div
            key={dev.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dev.status === "ONLINE" ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">{dev.type}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                      {dev.brand}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1 group-hover:text-cyan-300 transition">
                    {dev.name}
                  </h3>
                  <p className="text-xs text-slate-400">{dev.location}</p>
                </div>

                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
                  <Video className="w-4 h-4 text-cyan-400" />
                </div>
              </div>

              {/* Technical Specifications Specs */}
              <div className="space-y-1.5 text-[11px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Endereço IP:</span>
                  <span className="text-slate-200">{dev.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Portas RTSP/ONVIF:</span>
                  <span className="text-slate-200">{dev.rtspPort} / {dev.onvifPort}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolução & Codec:</span>
                  <span className="text-slate-200">{dev.resolution.split(" ")[0]} • {dev.codec}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MAC / Perfil:</span>
                  <span className="text-slate-400">{dev.macAddress.slice(0, 8)}... ({dev.onvifProfile})</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-900">
                  <span className="text-slate-500">Criptografia E2EE:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> AES-256
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>{dev.zonesCount} Zonas Perimétricas</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteDevice(dev)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="Remover Dispositivo (Requer 2FA)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Register Device Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Cadastrar Novo Dispositivo de Vigilância</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDevice} className="space-y-4">
              {/* Type Grid Selection */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Tipo de Dispositivo:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEVICE_TYPES.map((dt) => (
                    <button
                      key={dt.type}
                      type="button"
                      onClick={() => setType(dt.type)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        type === dt.type
                          ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <p className="text-xs font-semibold">{dt.label.split(" ")[0]}</p>
                      <p className="text-[10px] text-slate-500 truncate">{dt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* General Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Nome de Identificação:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Câmera 07 - Estacionamento VIP"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Localização Física / Setor:</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Portaria Principal, Galpão A..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Fabricante:</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    {BRAND_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Modelo Comercial:</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ex: VIP 3230 B, DS-2CD2043G2-I"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Network Configuration */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <span className="block text-xs font-mono text-cyan-400 font-bold uppercase">Parâmetros de Rede & Portas</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Endereço IP (IPv4):</label>
                    <input
                      type="text"
                      required
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="192.168.1.100"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Porta RTSP:</label>
                    <input
                      type="number"
                      value={rtspPort}
                      onChange={(e) => setRtspPort(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Porta ONVIF:</label>
                    <input
                      type="number"
                      value={onvifPort}
                      onChange={(e) => setOnvifPort(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Qtd. Canais:</label>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={channelCount}
                      onChange={(e) => setChannelCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Resolução do Sensor:</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="1920x1080 (Full HD)">1920x1080 (Full HD 1080p)</option>
                      <option value="2560x1440 (2K QHD)">2560x1440 (2K QHD 4MP)</option>
                      <option value="3840x2160 (4K UHD)">3840x2160 (4K UHD 8MP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Compressão Codec:</label>
                    <select
                      value={codec}
                      onChange={(e) => setCodec(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="H.265+">H.265+ Smart Codec</option>
                      <option value="H.264">H.264 Baseline</option>
                      <option value="AV1">AV1 Ultra-Eficiente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Ambiente de Simulação:</label>
                    <select
                      value={feedSimulationType}
                      onChange={(e) => setFeedSimulationType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="entrance">Portaria / Acesso</option>
                      <option value="perimeter">Perímetro / Muralha</option>
                      <option value="traffic">Estacionamento / Pátio</option>
                      <option value="server_room">CPD / Data Center</option>
                      <option value="warehouse">Galpão / Estoque</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Security & LGPD badge inside modal */}
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                <span>O dispositivo será ativado com Criptografia de Ponta a Ponta (AES-256) e auditoria de fluxo em conformidade com a LGPD.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar e Iniciar Monitoramento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
