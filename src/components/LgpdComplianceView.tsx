import React, { useState, useEffect } from "react";
import { LgpdSubjectRequest } from "../types";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";
import {
  ShieldCheck,
  FileCheck,
  UserCheck,
  Lock,
  Trash2,
  EyeOff,
  Clock,
  CheckCircle2,
  Plus,
  AlertCircle,
  FileText,
  BadgeCheck,
} from "lucide-react";

interface LgpdComplianceViewProps {
  onOpen2FA: (action: string, callback: () => void) => void;
}

export const LgpdComplianceView: React.FC<LgpdComplianceViewProps> = ({ onOpen2FA }) => {
  const [requests, setRequests] = useState<LgpdSubjectRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [requestType, setRequestType] = useState<string>("ACCESS_LOGS");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await api.getLgpdRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName) return;

    try {
      const newReq = await api.createLgpdRequest({
        subjectName,
        documentNumber,
        requestType,
      });
      setRequests([newReq, ...requests]);
      setIsModalOpen(false);
      setSubjectName("");
      setDocumentNumber("");
      playAlarmSound("ack");
      setSuccessToast(`Protocolo LGPD gerado com sucesso: ${newReq.protocolNumber}`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      alert(err.message || "Erro ao registrar protocolo LGPD.");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white font-mono">GOVERNANÇA & CONFORMIDADE LGPD (LEI 13.709/2018)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Garantia de privacidade dos titulares com mascaramento facial, retenção controlada de 30 dias e atendimento aos direitos do titular.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Requerimento de Titular</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Compliance Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Legal Basis Art. 7 IX */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase">Base Legal (Art. 7º, IX)</span>
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="text-sm font-bold text-white">Legítimo Interesse de Segurança</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            O tratamento de imagens e dados biométricos é fundamentado na proteção física e patrimonial de colaboradores e visitantes, com RIPD (Relatório de Impacto) registrado.
          </p>
        </div>

        {/* Automated 30-Day Purge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">Descarte Programado</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <h4 className="text-sm font-bold text-white">Ciclo de Higienização (30 Dias)</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Todas as gravações que não contenham flagrante de ilícito são permanentemente expurgadas após 30 dias, sem possibilidade de recuperação forense.
          </p>
        </div>

        {/* Real-time Privacy Masking */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-purple-400 font-bold uppercase">Privacidade por Padrão</span>
            <EyeOff className="w-4 h-4 text-purple-400" />
          </div>
          <h4 className="text-sm font-bold text-white">Borramento Facial Dinâmico</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Algoritmo embarcado aplica ofuscação volumétrica em rostos e placas de terceiros para visualizadores de nível operacional (Privacy by Design).
          </p>
        </div>
      </div>

      {/* Subject Requests Registry (Direitos dos Titulares) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono text-slate-400 uppercase font-bold">
              Registro de Solicitações de Titulares de Dados (Portal DPO)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Protocolos de pedidos de acesso, anonimização facial ou revogação formulados por cidadãos.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Protocolo</th>
                <th className="py-3 px-4">Data Abertura</th>
                <th className="py-3 px-4">Titular (CPF Mascarado)</th>
                <th className="py-3 px-4">Tipo de Solicitação</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Parecer do DPO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 text-cyan-400 font-bold">{req.protocolNumber}</td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(req.requestedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-white font-semibold block">{req.subjectName}</span>
                    <span className="text-[10px] text-slate-400">{req.documentNumber}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-950 text-slate-300 border border-slate-800 rounded text-[10px]">
                      {req.requestType === "ACCESS_LOGS"
                        ? "Acesso aos Registros"
                        : req.requestType === "ANONYMIZE_FOOTAGE"
                        ? "Anonimização de Imagens"
                        : req.requestType === "RIGHT_TO_FORGET"
                        ? "Direito ao Esquecimento"
                        : "Revogação"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                    {req.resolutionNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Subject Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <h3 className="text-base font-bold text-white mb-2">Novo Requerimento de Titular de Dados</h3>
            <p className="text-xs text-slate-400 mb-4">
              Atendimento aos direitos do titular previstos nos artigos 18 e 19 da LGPD (Lei 13.709/2018).
            </p>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nome Completo do Titular:</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Ex: João Ferreira de Souza"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Documento (CPF com mascaramento automático):</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ex: 123.456.789-00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Tipo de Solicitação:</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                >
                  <option value="ACCESS_LOGS">Acesso aos Registros em que Conste a Imagem</option>
                  <option value="ANONYMIZE_FOOTAGE">Anonimização / Borramento Facial Permanente</option>
                  <option value="RIGHT_TO_FORGET">Direito ao Esquecimento / Exclusão Antecipada</option>
                  <option value="REVOKE_CONSENT">Revogação de Consentimento</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Registrar e Gerar Protocolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
