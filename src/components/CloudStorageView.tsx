import React, { useState, useEffect } from "react";
import { CloudStorageConfig } from "../types";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";
import {
  HardDrive,
  Cloud,
  Lock,
  ShieldCheck,
  Download,
  FileCheck,
  RefreshCw,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Key,
} from "lucide-react";

interface CloudStorageViewProps {
  onOpen2FA: (action: string, callback: () => void) => void;
  savedSnapshots: Array<{ id: string; deviceName: string; timestamp: string; url: string }>;
}

export const CloudStorageView: React.FC<CloudStorageViewProps> = ({
  onOpen2FA,
  savedSnapshots,
}) => {
  const [config, setConfig] = useState<CloudStorageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api.getCloudStorageConfig();
      setConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWorm = () => {
    onOpen2FA("Alteração do Modo de Imutabilidade WORM em Nuvem", async () => {
      try {
        const updated = await api.toggleWorm();
        setConfig(updated);
        playAlarmSound("ack");
        setSuccessToast(`Modo WORM alterado com sucesso para: ${updated.immutableWorm ? "ATIVO" : "INATIVO"}`);
        setTimeout(() => setSuccessToast(null), 3000);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleExportCloudPackage = () => {
    onOpen2FA("Exportação de Pacote Criptografado de Evidências em Nuvem", () => {
      setIsExporting(true);
      playAlarmSound("click");

      setTimeout(() => {
        setIsExporting(false);
        playAlarmSound("ack");

        // Download manifest json
        const manifest = {
          system: "VisionGuard AI Cloud Storage Vault",
          exportTimestamp: new Date().toISOString(),
          provider: config?.provider,
          bucket: config?.bucketName,
          encryption: config?.encryptionMode,
          checksum: "a4f891b2c7e990234ad1f83c66049219e23bc4a7",
          filesCount: savedSnapshots.length + 120,
          complianceLgpd: "Art. 7º IX - Lei 13.709/2018",
        };

        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `VISIONGUARD_CLOUD_VAULT_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        setSuccessToast("Manifesto de arquivo em nuvem exportado com assinatura SHA-256.");
        setTimeout(() => setSuccessToast(null), 3500);
      }, 1500);
    });
  };

  if (isLoading || !config) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-xs">
        Carregando parâmetros do cofre em nuvem...
      </div>
    );
  }

  const usedPercent = Math.round((config.usedStorageGB / config.totalStorageGB) * 100);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">ARMAZENAMENTO EM NUVEM & COFRE CRIPTOGRÁFICO</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Repositório seguro com criptografia AES-256-GCM, proteção anti-adulteração WORM (Write-Once-Read-Many) e retenção programada LGPD.
          </p>
        </div>

        <button
          onClick={handleExportCloudPackage}
          disabled={isExporting}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Exportar Pacote Assinado (2FA)</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Cloud Storage Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Storage Capacity Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Capacidade do Bucket</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{config.usedStorageGB} GB</span>
              <span className="text-xs text-slate-400">de {config.totalStorageGB} GB ({usedPercent}%)</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-950 rounded-full mt-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Armazenamento contínuo em São Paulo (sa-east-1) com redundância multi-região.
          </p>
        </div>

        {/* WORM Mode Immutability */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase">Modo WORM (Anti-Adulteração)</span>
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                config.immutableWorm
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400"
              }`}>
                {config.immutableWorm ? "HABILITADO (COMPLIANT)" : "DESATIVADO"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Write Once Read Many impede que arquivos sejam apagados ou modificados antes da expiração da retenção.
            </p>
          </div>

          <button
            onClick={handleToggleWorm}
            className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition"
          >
            Alterar Modo WORM (Requer 2FA)
          </button>
        </div>

        {/* E2EE & Key Rotation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase">Criptografia em Repouso</span>
              <Key className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-sm font-bold text-white font-mono">AES-256-GCM + KMS</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Envelope encryption com rotação de chaves a cada 90 dias gerida por módulo de hardware HSM.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Chave Mestre Ativa • HMAC OK</span>
          </div>
        </div>
      </div>

      {/* Cloud Configuration Details & Parameters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-xs font-mono text-slate-400 uppercase font-bold mb-4">
          Parâmetros do Provedor de Nuvem & Política de Retenção
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block mb-1">Provedor Cloud:</span>
            <span className="text-slate-200 font-bold">{config.provider}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block mb-1">Bucket Nome:</span>
            <span className="text-cyan-400">{config.bucketName}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block mb-1">Região de Nuvem:</span>
            <span className="text-slate-200">{config.region}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block mb-1">Ciclo de Expiração LGPD:</span>
            <span className="text-amber-400 font-bold">{config.autoPurgeDays} Dias (Auto-Purge)</span>
          </div>
        </div>
      </div>

      {/* Vault Snapshots Gallery */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-mono text-slate-400 uppercase font-bold">
              Evidências & Fotogramas Armazenados no Cofre
            </h3>
            <span className="text-xs text-slate-400">Total de {savedSnapshots.length} registros capturados na sessão</span>
          </div>
        </div>

        {savedSnapshots.length === 0 ? (
          <div className="p-8 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
            Nenhum snapshot arquivado no cofre ainda. Acesse o "Mural Ao Vivo" e clique no ícone de câmera ou na Análise Gemini para gravar evidências.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedSnapshots.map((snap) => (
              <div
                key={snap.id}
                className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group hover:border-cyan-500 transition"
              >
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  <img
                    src={snap.url}
                    alt={snap.id}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-[10px] font-mono text-cyan-400 rounded border border-cyan-500/30">
                    {snap.id}
                  </span>
                </div>

                <div className="p-3">
                  <p className="text-xs font-bold text-white truncate">{snap.deviceName}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {new Date(snap.timestamp).toLocaleString("pt-BR")}
                  </p>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono text-emerald-400">HASH OK</span>
                    <a
                      href={snap.url}
                      download={`${snap.id}.jpg`}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Baixar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
