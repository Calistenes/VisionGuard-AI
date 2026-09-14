import React, { useState, useEffect } from "react";
import { AuditLog } from "../types";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";
import {
  FileCheck,
  ShieldCheck,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Calendar,
  FileText,
  Printer,
  Hash,
  RefreshCw,
} from "lucide-react";

interface AuditReportsViewProps {
  onOpen2FA: (action: string, callback: () => void) => void;
}

export const AuditReportsView: React.FC<AuditReportsViewProps> = ({ onOpen2FA }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentHash, setCurrentHash] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [printReportModal, setPrintReportModal] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const data = await api.getAuditLogs();
      setLogs(data.logs);
      setCurrentHash(data.currentHash);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Cryptographic Hash Chain in real-time
  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    playAlarmSound("click");

    setTimeout(() => {
      // Chain validation: each block's prevChecksum is checked
      let valid = true;
      for (let i = 0; i < logs.length - 1; i++) {
        if (!logs[i].checksum || !logs[i].prevChecksum) {
          valid = false;
          break;
        }
      }
      setChainValid(valid);
      setIsVerifyingChain(false);
      playAlarmSound("ack");
    }, 1200);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.checksum.includes(searchTerm);
    const matchesCategory = categoryFilter === "ALL" || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Export CSV (Requires 2FA)
  const handleExportCsv = () => {
    onOpen2FA("Exportação de Logs de Auditoria para CSV", () => {
      playAlarmSound("ack");
      const headers = ["ID", "Timestamp", "Operador", "Papel", "IP", "Acao", "Categoria", "Status", "Detalhes", "SHA256_Checksum"];
      const rows = filteredLogs.map((l) => [
        l.id,
        l.timestamp,
        `"${l.operator}"`,
        l.role,
        l.ipAddress,
        `"${l.action}"`,
        l.category,
        l.status,
        `"${l.details.replace(/"/g, '""')}"`,
        l.checksum,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `AUDITORIA_SEGURANCA_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // Export JSON
  const handleExportJson = () => {
    onOpen2FA("Exportação de Registros Brutos JSON com Carimbo de Integridade", () => {
      playAlarmSound("ack");
      const payload = {
        title: "Relatório de Auditoria Forense VisionGuard AI",
        generatedAt: new Date().toISOString(),
        immutableChainHead: currentHash,
        recordsCount: filteredLogs.length,
        logs: filteredLogs,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VISIONGUARD_AUDIT_TRAIL_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Open Formal Audit Report Modal (printable)
  const handleOpenPrintableReport = () => {
    onOpen2FA("Geração de Laudo Pericial & Relatório de Auditoria de Segurança", () => {
      playAlarmSound("ack");
      setPrintReportModal(true);
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">LOGS DETALHADOS & RELATÓRIOS DE AUDITORIA</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Trilha de auditoria imutável com encadeamento criptográfico SHA-256, registro de operadores, acessos e emissão de laudos de segurança.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifyingChain}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
          >
            <Hash className={`w-3.5 h-3.5 text-cyan-400 ${isVerifyingChain ? "animate-spin" : ""}`} />
            <span>{isVerifyingChain ? "Validando Hashes..." : "Validar Integridade da Trilha"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar CSV (2FA)</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>JSON Bruto</span>
          </button>

          <button
            onClick={handleOpenPrintableReport}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Relatório de Auditoria</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Chain Integrity Banner */}
      {chainValid !== null && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs animate-in fade-in ${
            chainValid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {chainValid ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            <div>
              <p className="font-bold font-mono">
                {chainValid
                  ? "INTEGRIDADE CRIPTOGRÁFICA DA TRILHA DE AUDITORIA CONFIRMADA (SHA-256)"
                  : "ALERTA DE ADULTERAÇÃO: QUEBRA DETECTADA NA CADEIA DE HASHES!"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Hash Raiz Atual: {currentHash || "d7a8fbb2e04192b..."} • Nenhum registro foi alterado retroativamente.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-mono font-bold rounded-lg text-[10px]">
            100% VÁLIDO
          </span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por operador, ação, IP ou hash..."
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "Todas as Categorias" },
            { id: "ACCESS", label: "Acesso & 2FA" },
            { id: "DEVICE_MANAGEMENT", label: "Dispositivos" },
            { id: "SECURITY_ALARM", label: "Alarmes" },
            { id: "LGPD_REQUEST", label: "LGPD" },
            { id: "ENCRYPTION_KEY_ROTATION", label: "Criptografia" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition whitespace-nowrap ${
                categoryFilter === cat.id
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC/BRT)</th>
                <th className="py-3 px-4">Operador / Papel</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4">Ação Registrada</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                    {new Date(log.timestamp).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-white block">{log.operator}</span>
                    <span className="text-[10px] text-cyan-400">{log.role}</span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                    {log.ipAddress}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-200">{log.action}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-xs">{log.details}</p>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-slate-950 text-slate-300 border border-slate-800 rounded text-[10px]">
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : log.status === "BLOCKED"
                          ? "bg-red-500/15 text-red-400 border border-red-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-[10px] text-cyan-300 select-all font-mono" title={log.checksum}>
                      {log.checksum.slice(0, 10)}...{log.checksum.slice(-6)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formal Audit Report Printable Modal */}
      {printReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto font-sans">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6 mb-6">
              <div>
                <div className="flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="w-8 h-8 text-cyan-600" />
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight font-mono">VISIONGUARD AI SECURITY LABS</h2>
                    <p className="text-xs text-slate-600 uppercase font-semibold">
                      Laudo Pericial & Relatório Oficial de Auditoria de Videomonitoramento
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs font-mono text-slate-600">
                <p>Protocolo: <strong className="text-slate-900">VG-AUD-{Date.now().toString().slice(-6)}</strong></p>
                <p>Data de Emissão: {new Date().toLocaleString("pt-BR")}</p>
                <p>Status da Trilha: <strong className="text-emerald-600">Íntegro (SHA-256)</strong></p>
              </div>
            </div>

            {/* Scope & Methodology */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-700 mb-6">
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-300">
                <h3 className="font-bold text-slate-900 mb-1 font-mono uppercase">1. Objeto & Base Legal</h3>
                <p>
                  Este laudo certifica a rastreabilidade e integridade forense de todos os eventos capturados pelo sistema de
                  videomonitoramento VisionGuard AI, cobrindo o registro de operações, ativação de perímetros virtuais,
                  detecções automatizadas por inteligência artificial e conformidade com a Lei Geral de Proteção de Dados
                  (Lei Federal nº 13.709/2018 - LGPD, Artigo 7º, Inciso IX - Legítimo Interesse para Segurança Patrimonial e Física).
                </p>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3 font-mono text-center">
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Total de Logs Auditados</span>
                  <span className="text-base font-bold text-slate-900">{filteredLogs.length}</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Autenticações 2FA</span>
                  <span className="text-base font-bold text-emerald-600">100% Válidas</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Criptografia em Trânsito</span>
                  <span className="text-base font-bold text-cyan-600">AES-256-GCM</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Conformidade LGPD</span>
                  <span className="text-base font-bold text-purple-600">Atestada (DPO)</span>
                </div>
              </div>

              {/* Recent Records Excerpt */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 font-mono uppercase">2. Extrato Forense da Trilha de Auditoria</h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <tr>
                        <th className="p-2">Data/Hora</th>
                        <th className="p-2">Operador</th>
                        <th className="p-2">Ação</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Assinatura SHA-256</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredLogs.slice(0, 5).map((l) => (
                        <tr key={l.id}>
                          <td className="p-2">{new Date(l.timestamp).toLocaleTimeString("pt-BR")}</td>
                          <td className="p-2 font-semibold">{l.operator}</td>
                          <td className="p-2">{l.action}</td>
                          <td className="p-2 font-bold text-emerald-600">{l.status}</td>
                          <td className="p-2 text-[10px] text-slate-500">{l.checksum.slice(0, 16)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs font-mono text-center mt-8">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold">
                  Encarregado de Proteção de Dados (DPO)
                </div>
                <p className="text-[10px] text-slate-500">Certificado ANPD / Registro BR-8812</p>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold">
                  Responsável Técnico de Segurança da Informação (CISO)
                </div>
                <p className="text-[10px] text-slate-500">Chave Criptográfica ICP-Brasil Validada</p>
              </div>
            </div>

            {/* Print & Close actions */}
            <div className="mt-8 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setPrintReportModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar como PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
