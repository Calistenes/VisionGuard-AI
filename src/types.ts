export type DeviceType = 
  | "DVR" 
  | "NVR" 
  | "IP_CAMERA" 
  | "PTZ_CAMERA" 
  | "THERMAL_CAMERA" 
  | "BODY_CAM";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  brand: string;
  model: string;
  ip: string;
  rtspPort: number;
  httpPort: number;
  onvifPort: number;
  macAddress: string;
  channelCount: number;
  location: string;
  status: "ONLINE" | "OFFLINE" | "DEGRADED";
  fps: number;
  bitrateKbps: number;
  resolution: string;
  codec: "H.265+" | "H.264" | "AV1";
  e2eeEnabled: boolean;
  onvifProfile: "Profile S" | "Profile T" | "Profile G" | "Custom";
  rtspUrl: string;
  cloudSync: boolean;
  retentionDays: number;
  feedSimulationType: "traffic" | "entrance" | "warehouse" | "perimeter" | "server_room" | "webcam";
  zonesCount: number;
  aiActive: boolean;
  createdAt: string;
}

export type PerimeterType = 
  | "INTRUSION_POLYGON" 
  | "TRIPWIRE_LINE" 
  | "LOITERING_ZONE" 
  | "DIRECTIONAL_FLOW";

export interface PerimeterZone {
  id: string;
  deviceId: string;
  name: string;
  type: PerimeterType;
  coordinates: Array<{ x: number; y: number }>;
  color: string;
  targetFilters: Array<"HUMAN" | "VEHICLE" | "ANIMAL" | "UNATTENDED_OBJECT">;
  sensitivity: number;
  dwellTimeSeconds: number;
  armed: boolean;
  alertActions: Array<"SIREN" | "NOTIFY_GUARD" | "RECORD_HIGH_FPS" | "CLOUD_VAULT_LOCK" | "SEND_TELEGRAM">;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  zoneName?: string;
  type: "INTRUSION" | "LINE_CROSSING" | "MOTION" | "TAMPERING" | "LOITERING" | "DEVICE_OFFLINE" | "UNATTENDED_OBJECT";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  confidence: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  snapshotUrl?: string;
  targetType?: "HUMAN" | "VEHICLE" | "ANIMAL" | "UNATTENDED_OBJECT" | "OBJECT" | "SYSTEM";
  boundingBox?: { x: number; y: number; w: number; h: number };
  aiAnalysis?: string;
  integrityHash: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  role: string;
  ipAddress: string;
  action: string;
  category: "ACCESS" | "DEVICE_MANAGEMENT" | "SECURITY_ALARM" | "EXPORT_DATA" | "LGPD_REQUEST" | "ENCRYPTION_KEY_ROTATION";
  status: "SUCCESS" | "BLOCKED" | "WARNING";
  details: string;
  checksum: string;
  prevChecksum: string;
}

export interface LgpdSubjectRequest {
  id: string;
  protocolNumber: string;
  requestedAt: string;
  subjectName: string;
  documentNumber: string;
  requestType: "ACCESS_LOGS" | "RIGHT_TO_FORGET" | "ANONYMIZE_FOOTAGE" | "REVOKE_CONSENT";
  status: "COMPLETED" | "PROCESSING" | "SCHEDULED";
  resolutionNote: string;
  dpoApproval: string;
}

export interface CloudStorageConfig {
  provider: string;
  bucketName: string;
  region: string;
  encryptionMode: string;
  totalStorageGB: number;
  usedStorageGB: number;
  immutableWorm: boolean;
  autoPurgeDays: number;
  continuousSync: boolean;
  bandwidthThrottleMbps: number;
}

export interface AiDetectionResult {
  label: string;
  type: "HUMAN" | "VEHICLE" | "ANIMAL" | "UNATTENDED_OBJECT";
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  threatScore?: number;
  posture?: string;
}

export interface AiSceneAnalysisResponse {
  success: boolean;
  engine: string;
  analyzedAt: string;
  threatScore: number;
  threatLevel: "BAIXO" | "MÉDIO" | "ELEVADO" | "CRÍTICO";
  perimeterBreached: boolean;
  summary: string;
  detections: AiDetectionResult[];
  recommendedAction: string;
  lgpdComplianceAssessment?: string;
  lgpdNotice?: string;
}
