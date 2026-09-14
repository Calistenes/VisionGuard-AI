import React, { useState } from "react";
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle2, QrCode, X } from "lucide-react";
import { api } from "../services/api";
import { playAlarmSound } from "../utils/audio";

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sessionToken?: string) => void;
  actionTitle?: string;
  actionDescription?: string;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = "Ação Protegida por 2FA",
  actionDescription = "Esta operação manipula dados confidenciais e requer validação de segundo fator (TOTP) conforme política de segurança e LGPD.",
}) => {
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || (code.length !== 6 && !useRecoveryCode)) {
      setError(useRecoveryCode ? "Insira o código de recuperação completo." : "O código de 6 dígitos é obrigatório.");
      playAlarmSound("warning");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.verify2FA(code, actionTitle);
      if (res.verified) {
        setSuccess(true);
        playAlarmSound("ack");
        setTimeout(() => {
          onSuccess(res.sessionToken);
          onClose();
          setCode("");
          setSuccess(false);
        }, 800);
      } else {
        setError("Código TOTP inválido. Verifique o relógio do seu autenticador.");
        playAlarmSound("warning");
      }
    } catch (err: any) {
      setError(err.message || "Erro na validação do token.");
      playAlarmSound("warning");
    } finally {
      setIsLoading(false);
    }
  };

  const fillMasterDemoCode = () => {
    setCode("954120");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">{actionTitle}</h3>
            <span className="text-xs font-mono text-cyan-400">RFC 6238 TOTP • Hardware Security</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-5">
          {actionDescription}
        </p>

        {/* QR Code / Authenticator Info box */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center text-slate-900">
              <QrCode className="w-10 h-10" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Google / Microsoft Authenticator</p>
              <p className="text-[11px] font-mono text-slate-400">Chave: JBSW-Y3DP-EHPK-3PXP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fillMasterDemoCode}
            className="px-2.5 py-1 text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-md hover:bg-cyan-500/20 transition"
          >
            Preencher Demo
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {useRecoveryCode ? "Chave de Recuperação de Emergência" : "Código de 6 Dígitos do Aplicativo"}
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                maxLength={useRecoveryCode ? 16 : 6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                placeholder={useRecoveryCode ? "VG-8941-22" : "000000"}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white outline-none transition"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Autenticação de 2 fatores aprovada! Processando...</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode(!useRecoveryCode);
                setCode("");
                setError(null);
              }}
              className="hover:text-cyan-400 underline transition"
            >
              {useRecoveryCode ? "Usar token do Authenticator" : "Usar código de recuperação reserva"}
            </button>
            <span className="font-mono text-[11px] text-slate-500">Expira em 30s</span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || success}
              className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Validar e Prosseguir</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
