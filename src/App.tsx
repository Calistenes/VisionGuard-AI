import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { LiveMonitor } from "./components/LiveMonitor";
import { DeviceManager } from "./components/DeviceManager";
import { PerimeterEditor } from "./components/PerimeterEditor";
import { AlertsPanel } from "./components/AlertsPanel";
import { CloudStorageView } from "./components/CloudStorageView";
import { AuditReportsView } from "./components/AuditReportsView";
import { LgpdComplianceView } from "./components/LgpdComplianceView";
import { TwoFactorModal } from "./components/TwoFactorModal";
import { Device, PerimeterZone, SecurityAlert } from "./types";
import { api } from "./services/api";
import { playAlarmSound } from "./utils/audio";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("monitor");
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [privacyMasking, setPrivacyMasking] = useState<boolean>(true);
  const [aiBoundingBoxes, setAiBoundingBoxes] = useState<boolean>(true);

  const [devices, setDevices] = useState<Device[]>([]);
  const [perimeters, setPerimeters] = useState<PerimeterZone[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [savedSnapshots, setSavedSnapshots] = useState<Array<{ id: string; deviceName: string; timestamp: string; url: string }>>([]);

  const [is2FAVerified, setIs2FAVerified] = useState<boolean>(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState<boolean>(false);
  const [twoFactorActionTitle, setTwoFactorActionTitle] = useState<string>("Validação de Segundo Fator");
  const [twoFactorActionCallback, setTwoFactorActionCallback] = useState<(() => void) | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial system data
  useEffect(() => {
    async function init() {
      try {
        const [devs, perims, alts] = await Promise.all([
          api.getDevices(),
          api.getPerimeters(),
          api.getAlerts(),
        ]);
        setDevices(devs);
        setPerimeters(perims);
        setAlerts(alts);
      } catch (err) {
        console.error("Falha ao inicializar dados do sistema:", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // 2FA protected actions invoker
  const triggerWith2FA = useCallback((actionTitle: string, callback: () => void) => {
    if (is2FAVerified) {
      callback();
      return;
    }
    setTwoFactorActionTitle(actionTitle);
    setTwoFactorActionCallback(() => callback);
    setIs2FAModalOpen(true);
  }, [is2FAVerified]);

  // Handle 2FA success
  const handle2FASuccess = () => {
    setIs2FAVerified(true);
    if (twoFactorActionCallback) {
      twoFactorActionCallback();
      setTwoFactorActionCallback(null);
    }
  };

  // Simulate Instant Intrusion Trigger
  const handleSimulateIntrusion = async () => {
    const targetDev = devices[1] || devices[0];
    if (!targetDev) return;

    if (!audioMuted) {
      playAlarmSound("critical");
    }

    try {
      const newAlert = await api.triggerAlert({
        deviceId: targetDev.id,
        type: "INTRUSION",
        severity: "CRITICAL",
        description: `INTRUSÃO DETECTADA: Indivíduo não identificado transpondo o perímetro monitorado de ${targetDev.name}.`,
        targetType: "HUMAN",
        confidence: 0.98,
        boundingBox: { x: 45, y: 32, w: 22, h: 48 },
        aiAnalysis: `Motor de visão neural identificou transposição ilegal em velocidade de aproximação rápida. Ação imediata recomendada.`,
      });

      setAlerts((prev) => [newAlert, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Zone Test from Perimeter Editor
  const handleSimulateZoneAlert = async (zone: PerimeterZone, dev: Device) => {
    if (!audioMuted) {
      playAlarmSound("critical");
    }

    try {
      const newAlert = await api.triggerAlert({
        deviceId: dev.id,
        zoneName: zone.name,
        type: zone.type === "TRIPWIRE_LINE" ? "LINE_CROSSING" : "INTRUSION",
        severity: "HIGH",
        description: `Disparo de teste na zona perimétrica "${zone.name}". Cruzamento de limite ativado.`,
        targetType: zone.targetFilters[0] || "HUMAN",
        confidence: 0.95,
        boundingBox: { x: zone.coordinates[0]?.x || 30, y: zone.coordinates[0]?.y || 40, w: 20, h: 40 },
        aiAnalysis: `Alarme disparado conforme sensibilidade configurada de ${zone.sensitivity}%. Ações executadas: ${zone.alertActions.join(", ")}.`,
      });

      setAlerts((prev) => [newAlert, ...prev]);
      setActiveTab("alerts");
    } catch (err) {
      console.error(err);
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-mono text-xs">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-cyan-400 font-bold tracking-wider">INICIALIZANDO VISIONGUARD AI SECURITY CORE...</p>
        <span className="text-slate-500 text-[11px] mt-1">Carregando dispositivos, chaves criptográficas e trilha de auditoria</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300 font-sans">
      {/* Top Fixed Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioMuted={audioMuted}
        setAudioMuted={setAudioMuted}
        unacknowledgedAlertsCount={unacknowledgedCount}
        onSimulateIntrusion={handleSimulateIntrusion}
        onOpen2FAModal={() => triggerWith2FA("Validação de Identidade do Operador", () => {})}
        is2FAVerified={is2FAVerified}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {activeTab === "monitor" && (
          <LiveMonitor
            devices={devices}
            perimeters={perimeters}
            activeAlerts={alerts}
            privacyMasking={privacyMasking}
            setPrivacyMasking={setPrivacyMasking}
            aiBoundingBoxes={aiBoundingBoxes}
            setAiBoundingBoxes={setAiBoundingBoxes}
            onSnapshotSaved={(snap) => setSavedSnapshots((prev) => [snap, ...prev])}
            onOpen2FA={triggerWith2FA}
          />
        )}

        {activeTab === "devices" && (
          <DeviceManager
            devices={devices}
            onDeviceCreated={(newDev) => setDevices((prev) => [...prev, newDev])}
            onDeviceUpdated={(updated) => setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))}
            onDeviceDeleted={(id) => setDevices((prev) => prev.filter((d) => d.id !== id))}
            onOpen2FA={triggerWith2FA}
          />
        )}

        {activeTab === "perimeters" && (
          <PerimeterEditor
            devices={devices}
            perimeters={perimeters}
            onPerimeterCreated={(newZone) => setPerimeters((prev) => [...prev, newZone])}
            onPerimeterToggled={(toggled) => setPerimeters((prev) => prev.map((z) => (z.id === toggled.id ? toggled : z)))}
            onSimulateZoneAlert={handleSimulateZoneAlert}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsPanel
            alerts={alerts}
            devices={devices}
            onAlertAcknowledged={(ack) => setAlerts((prev) => prev.map((a) => (a.id === ack.id ? ack : a)))}
            onSimulateIntrusion={handleSimulateIntrusion}
          />
        )}

        {activeTab === "cloud" && (
          <CloudStorageView
            onOpen2FA={triggerWith2FA}
            savedSnapshots={savedSnapshots}
          />
        )}

        {activeTab === "audit" && (
          <AuditReportsView onOpen2FA={triggerWith2FA} />
        )}

        {activeTab === "lgpd" && (
          <LgpdComplianceView onOpen2FA={triggerWith2FA} />
        )}
      </main>

      {/* 2FA Challenge Modal */}
      <TwoFactorModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        onSuccess={handle2FASuccess}
        actionTitle={twoFactorActionTitle}
      />
    </div>
  );
}
