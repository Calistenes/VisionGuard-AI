import { 
  Device, 
  PerimeterZone, 
  SecurityAlert, 
  AuditLog, 
  CloudStorageConfig, 
  LgpdSubjectRequest,
  AiSceneAnalysisResponse
} from "../types";

export const api = {
  // Devices
  async getDevices(): Promise<Device[]> {
    const res = await fetch("/api/devices");
    if (!res.ok) throw new Error("Falha ao carregar dispositivos.");
    const data = await res.json();
    return data.devices;
  },

  async createDevice(deviceData: Partial<Device>): Promise<Device> {
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao cadastrar dispositivo.");
    }
    const data = await res.json();
    return data.device;
  },

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
    const res = await fetch(`/api/devices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Falha ao atualizar dispositivo.");
    const data = await res.json();
    return data.device;
  },

  async deleteDevice(id: string): Promise<boolean> {
    const res = await fetch(`/api/devices/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Falha ao remover dispositivo.");
    return true;
  },

  // Perimeters
  async getPerimeters(): Promise<PerimeterZone[]> {
    const res = await fetch("/api/perimeters");
    if (!res.ok) throw new Error("Falha ao carregar perímetros.");
    const data = await res.json();
    return data.perimeters;
  },

  async createPerimeter(zoneData: Partial<PerimeterZone>): Promise<PerimeterZone> {
    const res = await fetch("/api/perimeters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zoneData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao salvar perímetro.");
    }
    const data = await res.json();
    return data.zone;
  },

  async togglePerimeter(id: string): Promise<PerimeterZone> {
    const res = await fetch(`/api/perimeters/${id}/toggle`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Falha ao alternar arme da zona.");
    const data = await res.json();
    return data.zone;
  },

  // Alerts
  async getAlerts(): Promise<SecurityAlert[]> {
    const res = await fetch("/api/alerts");
    if (!res.ok) throw new Error("Falha ao carregar alertas.");
    const data = await res.json();
    return data.alerts;
  },

  async triggerAlert(alertData: Partial<SecurityAlert>): Promise<SecurityAlert> {
    const res = await fetch("/api/alerts/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertData),
    });
    if (!res.ok) throw new Error("Falha ao disparar alerta.");
    const data = await res.json();
    return data.alert;
  },

  async acknowledgeAlert(id: string, operator: string): Promise<SecurityAlert> {
    const res = await fetch(`/api/alerts/${id}/ack`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator }),
    });
    if (!res.ok) throw new Error("Falha ao reconhecer alerta.");
    const data = await res.json();
    return data.alert;
  },

  // Audit Logs
  async getAuditLogs(): Promise<{ logs: AuditLog[]; currentHash: string }> {
    const res = await fetch("/api/audit-logs");
    if (!res.ok) throw new Error("Falha ao carregar logs de auditoria.");
    return await res.json();
  },

  // Cloud Storage
  async getCloudStorageConfig(): Promise<CloudStorageConfig> {
    const res = await fetch("/api/cloud-storage");
    if (!res.ok) throw new Error("Falha ao carregar configuração de nuvem.");
    const data = await res.json();
    return data.config;
  },

  async toggleWorm(): Promise<CloudStorageConfig> {
    const res = await fetch("/api/cloud-storage/toggle-worm", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Falha ao alternar modo WORM.");
    const data = await res.json();
    return data.config;
  },

  // LGPD
  async getLgpdRequests(): Promise<LgpdSubjectRequest[]> {
    const res = await fetch("/api/lgpd/requests");
    if (!res.ok) throw new Error("Falha ao carregar solicitações LGPD.");
    const data = await res.json();
    return data.requests;
  },

  async createLgpdRequest(data: { subjectName: string; documentNumber: string; requestType: string }): Promise<LgpdSubjectRequest> {
    const res = await fetch("/api/lgpd/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Falha ao registrar solicitação LGPD.");
    const resData = await res.json();
    return resData.request;
  },

  // 2FA Verification
  async verify2FA(token: string, action: string): Promise<{ verified: boolean; sessionToken?: string }> {
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Falha na verificação de 2 fatores.");
    }
    return await res.json();
  },

  // AI Scene Analysis (Gemini / Edge)
  async analyzeScene(payload: {
    imageBase64: string;
    deviceName: string;
    zoneRules?: string;
    contextNotes?: string;
  }): Promise<AiSceneAnalysisResponse> {
    const res = await fetch("/api/ai/analyze-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Falha ao processar análise inteligente.");
    return await res.json();
  },
};
