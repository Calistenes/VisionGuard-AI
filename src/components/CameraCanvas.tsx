import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Device, PerimeterZone, AiDetectionResult } from "../types";
import { Lock, Shield, Video, AlertTriangle } from "lucide-react";

export interface CameraCanvasHandle {
  captureSnapshot: () => string | null;
  getCanvas: () => HTMLCanvasElement | null;
}

interface CameraCanvasProps {
  device: Device;
  zones?: PerimeterZone[];
  privacyMasking?: boolean;
  aiBoundingBoxes?: boolean;
  ptzZoom?: number;
  ptzPan?: { x: number; y: number };
  isWebcamActive?: boolean;
  onSnapshotReady?: (base64: string) => void;
  highlightAlert?: boolean;
}

export const CameraCanvas = forwardRef<CameraCanvasHandle, CameraCanvasProps>(({
  device,
  zones = [],
  privacyMasking = true,
  aiBoundingBoxes = true,
  ptzZoom = 1,
  ptzPan = { x: 0, y: 0 },
  isWebcamActive = false,
  highlightAlert = false,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      if (!canvasRef.current) return null;
      try {
        return canvasRef.current.toDataURL("image/jpeg", 0.85);
      } catch (e) {
        console.error("Erro ao capturar snapshot:", e);
        return null;
      }
    },
    getCanvas: () => canvasRef.current,
  }));

  // Entities state for animated CCTV scene simulation
  const sceneState = useRef({
    step: 0,
    pedestrians: [
      { id: 1, x: 20, y: 55, targetX: 85, speed: 0.25, dir: 1, type: "HUMAN", label: "Pessoa [ID #01]", faceMask: true },
      { id: 2, x: 70, y: 65, targetX: 15, speed: -0.18, dir: -1, type: "HUMAN", label: "Pessoa [ID #02]", faceMask: true },
    ],
    vehicles: [
      { id: 10, x: 10, y: 70, speed: 0.4, type: "VEHICLE", label: "Veículo [ABC-4E20]" }
    ],
    rackLeds: Array.from({ length: 18 }, () => Math.random() > 0.3),
    noiseSeed: 0,
  });

  // Setup webcam stream if device is webcam and activated
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isWebcamActive && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
          setWebcamError(null);
        })
        .catch((err) => {
          console.warn("Webcam não acessível:", err);
          setWebcamError("Permissão de webcam não concedida ou dispositivo indisponível.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isWebcamActive]);

  // Main rendering loop for canvas
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const state = sceneState.current;
    state.step++;

    ctx.save();
    // Clear background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    // Apply PTZ Zoom and Pan
    ctx.translate(width / 2, height / 2);
    ctx.scale(ptzZoom, ptzZoom);
    ctx.translate(-width / 2 + ptzPan.x, -height / 2 + ptzPan.y);

    if (isWebcamActive && videoRef.current && videoRef.current.readyState >= 2) {
      // Draw actual webcam video
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      // Draw rich synthetic CCTV scene based on feedSimulationType
      drawSimulatedScene(ctx, width, height, device.feedSimulationType, state);
    }

    // Draw Privacy Masking (Face & Plate Blur/Pixelation if enabled)
    if (privacyMasking) {
      drawPrivacyMasks(ctx, width, height, state);
    }

    // Draw Configured Perimeter Polygons and Tripwires
    drawPerimeters(ctx, width, height, zones);

    // Draw Real-time AI Bounding Boxes
    if (aiBoundingBoxes) {
      drawAiDetections(ctx, width, height, state, device.feedSimulationType);
    }

    // Apply subtle CCTV scanline and sensor noise
    drawCctvEffects(ctx, width, height, state);

    ctx.restore();

    // Draw OSD (On-Screen Display) always upright, ignoring PTZ transform
    drawOsdOverlay(ctx, width, height, device, highlightAlert);

    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [device, zones, privacyMasking, aiBoundingBoxes, ptzZoom, ptzPan, isWebcamActive, highlightAlert]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderFrame]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-950 select-none ${highlightAlert ? "ring-2 ring-red-500 ring-offset-2 ring-offset-slate-950 animate-pulse" : ""}`}>
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full object-cover block"
      />
      {/* Hidden video element for webcam */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {webcamError && isWebcamActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-amber-400 p-4 text-center">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p className="text-xs font-medium">{webcamError}</p>
          <span className="text-[10px] text-slate-400 mt-1">Exibindo simulação NPU de contingência.</span>
        </div>
      )}
    </div>
  );
});

CameraCanvas.displayName = "CameraCanvas";

// ==========================================
// SCENE DRAWING UTILITIES
// ==========================================

function drawSimulatedScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: string,
  state: any
) {
  const step = state.step;

  if (type === "perimeter") {
    // Night exterior with perimeter concrete wall and razor wire
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    skyGrad.addColorStop(0, "#050811");
    skyGrad.addColorStop(1, "#121b2d");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.7);

    // Distant trees/hills
    ctx.fillStyle = "#0c1322";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.3, h * 0.5);
    ctx.lineTo(w * 0.7, h * 0.53);
    ctx.lineTo(w, h * 0.48);
    ctx.lineTo(w, h * 0.7);
    ctx.lineTo(0, h * 0.7);
    ctx.fill();

    // High perimeter concrete wall
    ctx.fillStyle = "#1e2638";
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // Wall texture vertical pillars
    ctx.fillStyle = "#253046";
    for (let x = 40; x < w; x += 180) {
      ctx.fillRect(x, h * 0.58, 25, h * 0.42);
    }

    // Security floodlight cone with oscillating beam
    const beamAngle = Math.sin(step * 0.02) * 0.2;
    ctx.save();
    ctx.translate(w * 0.85, h * 0.3);
    ctx.rotate(beamAngle);
    const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, h * 0.6, 250);
    coneGrad.addColorStop(0, "rgba(230, 240, 255, 0.35)");
    coneGrad.addColorStop(1, "rgba(230, 240, 255, 0)");
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-140, h * 0.7);
    ctx.lineTo(140, h * 0.7);
    ctx.lineTo(15, 0);
    ctx.fill();
    ctx.restore();

    // Concertina razor wire atop wall
    ctx.strokeStyle = "rgba(180, 200, 220, 0.6)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < w; x += 22) {
      ctx.ellipse(x + 10, h * 0.59, 14, 8, 0, 0, Math.PI * 2);
    }
    ctx.stroke();

    // Moving intruder entity climbing wall / approaching
    const intruderX = (w * 0.42) + Math.sin(step * 0.015) * 40;
    const intruderY = h * 0.55 + Math.cos(step * 0.03) * 6;
    drawSilhouettedHuman(ctx, intruderX, intruderY, 0.85, true);

  } else if (type === "server_room") {
    // Data Center & CPD with server racks, blue/cyan glowing server leds
    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, w, h);

    // Perspective floor tiles (Data center elevated floor grid)
    ctx.strokeStyle = "rgba(30, 48, 77, 0.4)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.5);
      ctx.lineTo((x - w / 2) * 2.5 + w / 2, h);
      ctx.stroke();
    }
    for (let y = h * 0.5; y <= h; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Left Server Racks
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, h * 0.15, w * 0.32, h * 0.75);
    ctx.strokeStyle = "#1f2937";
    ctx.strokeRect(0, h * 0.15, w * 0.32, h * 0.75);

    // Right Server Racks
    ctx.fillStyle = "#111827";
    ctx.fillRect(w * 0.68, h * 0.15, w * 0.32, h * 0.75);
    ctx.strokeStyle = "#1f2937";
    ctx.strokeRect(w * 0.68, h * 0.15, w * 0.32, h * 0.75);

    // Glowing blinking activity LEDs on racks
    for (let i = 0; i < 24; i++) {
      const rx = (i % 2 === 0 ? 30 : 60) + (i % 4) * 20;
      const ry = h * 0.2 + (i * 18);
      const isGreen = (step + i * 7) % 25 > 8;
      ctx.fillStyle = isGreen ? "#10b981" : "#06b6d4";
      ctx.shadowColor = isGreen ? "#10b981" : "#06b6d4";
      ctx.shadowBlur = 6;
      ctx.fillRect(rx, ry, 6, 3);

      const rx2 = w * 0.72 + (i % 4) * 22;
      ctx.fillStyle = ((step + i * 3) % 30 > 12) ? "#06b6d4" : "#3b82f6";
      ctx.shadowColor = "#3b82f6";
      ctx.fillRect(rx2, ry, 6, 3);
    }
    ctx.shadowBlur = 0;

    // Pedestrian IT tech walking between aisles
    const techX = w * 0.48 + Math.sin(step * 0.02) * 25;
    const techY = h * 0.45;
    drawPedestrianEntity(ctx, techX, techY, 1.1, "Técnico CPD (Credenciado)");

  } else if (type === "traffic") {
    // Fleet parking lot & logistics gates
    // Asphalt ground
    ctx.fillStyle = "#151b26";
    ctx.fillRect(0, h * 0.35, w, h * 0.65);

    // Background logistics warehouse facade
    ctx.fillStyle = "#1f293d";
    ctx.fillRect(0, 0, w, h * 0.38);
    ctx.fillStyle = "#374151";
    ctx.fillRect(w * 0.2, h * 0.1, w * 0.25, h * 0.28); // Dock 01
    ctx.fillRect(w * 0.55, h * 0.1, w * 0.25, h * 0.28); // Dock 02

    // Parking lines (yellow angled parking spaces)
    ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
    ctx.lineWidth = 3;
    for (let px = 80; px < w; px += 140) {
      ctx.beginPath();
      ctx.moveTo(px, h * 0.7);
      ctx.lineTo(px + 60, h * 0.95);
      ctx.stroke();
    }

    // Vehicle in motion driving across lot
    const carX = ((step * 1.5) % (w + 200)) - 100;
    drawVehicle(ctx, carX, h * 0.72, 1.2);

  } else {
    // Entrance / Reception / Portaria Default
    // Floor
    ctx.fillStyle = "#121824";
    ctx.fillRect(0, h * 0.45, w, h * 0.55);

    // Glass walls & security checkpoint booth
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h * 0.45);

    // Security Gate turnstiles / Cancela de Acesso
    ctx.fillStyle = "#334155";
    ctx.fillRect(w * 0.35, h * 0.4, 25, h * 0.3);
    ctx.fillRect(w * 0.65, h * 0.4, 25, h * 0.3);

    // Gate barrier arm
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.5);
    ctx.lineTo(w * 0.65, h * 0.5);
    ctx.stroke();

    // RFID Reader LED
    ctx.fillStyle = (step % 40 > 20) ? "#22c55e" : "#3b82f6";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(w * 0.35 + 12, h * 0.42, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Moving visitors
    const p1X = (w * 0.2) + ((step * 0.8) % (w * 0.6));
    drawPedestrianEntity(ctx, p1X, h * 0.42, 1.15, "Visitante [Recepção]");
  }
}

function drawSilhouettedHuman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  crouching = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#05070d";

  // Head
  ctx.beginPath();
  ctx.arc(0, crouching ? -30 : -50, 10, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.beginPath();
  ctx.roundRect(-10, crouching ? -20 : -38, 20, crouching ? 28 : 40, 4);
  ctx.fill();

  // Limbs
  ctx.strokeStyle = "#05070d";
  ctx.lineWidth = 6;
  ctx.beginPath();
  // Arms
  ctx.moveTo(-10, -25);
  ctx.lineTo(-20, -10);
  ctx.moveTo(10, -25);
  ctx.lineTo(20, -10);
  // Legs
  ctx.moveTo(-6, crouching ? 8 : 2);
  ctx.lineTo(-12, crouching ? 25 : 35);
  ctx.moveTo(6, crouching ? 8 : 2);
  ctx.lineTo(12, crouching ? 25 : 35);
  ctx.stroke();

  ctx.restore();
}

function drawPedestrianEntity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  _label: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Clothing body
  ctx.fillStyle = "#1e3a8a"; // Blue jacket
  ctx.beginPath();
  ctx.roundRect(-12, -45, 24, 42, 5);
  ctx.fill();

  // Head
  ctx.fillStyle = "#fcd34d";
  ctx.beginPath();
  ctx.arc(0, -56, 9, 0, Math.PI * 2);
  ctx.fill();

  // Pants
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-10, -3, 8, 38);
  ctx.fillRect(2, -3, 8, 38);

  ctx.restore();
}

function drawVehicle(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Chassis
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.roundRect(-50, -20, 100, 30, 8);
  ctx.fill();

  // Roof
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-25, -20);
  ctx.lineTo(-10, -40);
  ctx.lineTo(20, -40);
  ctx.lineTo(35, -20);
  ctx.closePath();
  ctx.fill();

  // Windows
  ctx.fillStyle = "rgba(147, 197, 253, 0.4)";
  ctx.beginPath();
  ctx.moveTo(-20, -22);
  ctx.lineTo(-8, -37);
  ctx.lineTo(18, -37);
  ctx.lineTo(30, -22);
  ctx.closePath();
  ctx.fill();

  // Wheels
  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.arc(-30, 12, 11, 0, Math.PI * 2);
  ctx.arc(30, 12, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.arc(-30, 12, 4, 0, Math.PI * 2);
  ctx.arc(30, 12, 4, 0, Math.PI * 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = "#fef08a";
  ctx.shadowColor = "#fef08a";
  ctx.shadowBlur = 10;
  ctx.fillRect(48, -12, 4, 10);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawPrivacyMasks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: any
) {
  // Gaussian-style pixelated privacy patch for LGPD compliance
  ctx.save();
  const step = state.step;
  const p1X = (w * 0.2) + ((step * 0.8) % (w * 0.6));
  const p1Y = h * 0.42 - 58;

  // Face privacy blur mosaic
  ctx.fillStyle = "rgba(71, 85, 105, 0.95)";
  ctx.beginPath();
  ctx.roundRect(p1X - 12, p1Y - 12, 24, 24, 4);
  ctx.fill();

  // LGPD Privacy Tag
  ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
  ctx.fillRect(p1X - 22, p1Y - 26, 44, 12);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 8px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("LGPD BLUR", p1X, p1Y - 17);

  ctx.restore();
}

function drawPerimeters(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  zones: PerimeterZone[]
) {
  zones.forEach((zone) => {
    if (!zone.coordinates || zone.coordinates.length < 2) return;

    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = zone.color || "#ef4444";
    ctx.fillStyle = `${zone.color || "#ef4444"}22`; // 14% opacity fill

    ctx.beginPath();
    const first = zone.coordinates[0];
    ctx.moveTo((first.x / 100) * w, (first.y / 100) * h);

    for (let i = 1; i < zone.coordinates.length; i++) {
      const pt = zone.coordinates[i];
      ctx.lineTo((pt.x / 100) * w, (pt.y / 100) * h);
    }

    if (zone.type !== "TRIPWIRE_LINE") {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();

    // Draw vertex handles & zone label
    zone.coordinates.forEach((pt, idx) => {
      const vx = (pt.x / 100) * w;
      const vy = (pt.y / 100) * h;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(vx, vy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = zone.color;
      ctx.stroke();

      if (idx === 0) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(vx, vy - 20, 130, 18);
        ctx.fillStyle = zone.color;
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(`ZONE: ${zone.name.toUpperCase().slice(0, 16)}`, vx + 5, vy - 8);
      }
    });

    ctx.restore();
  });
}

function drawAiDetections(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: any,
  type: string
) {
  ctx.save();
  const step = state.step;

  if (type === "perimeter") {
    // Detect intruder near wall
    const ix = (w * 0.42) + Math.sin(step * 0.015) * 40;
    const iy = h * 0.55 + Math.cos(step * 0.03) * 6;
    drawBBox(ctx, ix - 24, iy - 60, 48, 85, "INVASOR DETECTADO 96%", "#ef4444", true);
  } else if (type === "server_room") {
    const tx = w * 0.48 + Math.sin(step * 0.02) * 25;
    const ty = h * 0.45;
    drawBBox(ctx, tx - 22, ty - 65, 44, 90, "PESSOA (CPD) 94%", "#06b6d4", false);
  } else if (type === "traffic") {
    const carX = ((step * 1.5) % (w + 200)) - 100;
    drawBBox(ctx, carX - 60, h * 0.72 - 50, 120, 75, "VEÍCULO [ABC-4E20] 91%", "#f59e0b", false);
  } else {
    const p1X = (w * 0.2) + ((step * 0.8) % (w * 0.6));
    drawBBox(ctx, p1X - 25, h * 0.42 - 68, 50, 95, "HUMAN [ID 408] 97%", "#10b981", false);
  }

  ctx.restore();
}

function drawBBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bw: number,
  bh: number,
  label: string,
  color: string,
  urgent = false
) {
  // Corner-bracket style bounding box
  ctx.strokeStyle = color;
  ctx.lineWidth = urgent ? 2.5 : 1.8;

  const corner = 10;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + corner);
  ctx.lineTo(x, y);
  ctx.lineTo(x + corner, y);
  // Top-right
  ctx.moveTo(x + bw - corner, y);
  ctx.lineTo(x + bw, y);
  ctx.lineTo(x + bw, y + corner);
  // Bottom-right
  ctx.moveTo(x + bw, y + bh - corner);
  ctx.lineTo(x + bw, y + bh);
  ctx.lineTo(x + bw - corner, y + bh);
  // Bottom-left
  ctx.moveTo(x + corner, y + bh);
  ctx.lineTo(x, y + bh);
  ctx.lineTo(x, y + bh - corner);
  ctx.stroke();

  // Label tag
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 16, label.length * 7 + 10, 16);
  ctx.fillStyle = "#020617";
  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 5, y - 4);
}

function drawCctvEffects(ctx: CanvasRenderingContext2D, w: number, h: number, state: any) {
  // Fine scanlines
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1);
  }
}

function drawOsdOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  device: Device,
  highlightAlert: boolean
) {
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").replace("Z", "");

  ctx.save();
  ctx.font = "bold 13px 'JetBrains Mono', monospace";

  // Top Left: Camera Name + Location
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(16, 16, 320, 48);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(device.name.toUpperCase(), 26, 36);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.fillText(`${device.brand} • ${device.ip}:${device.rtspPort}`, 26, 54);

  // Top Right: Live REC status + Timestamp
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(w - 300, 16, 284, 48);

  // Blinking REC dot
  const isBlink = Math.floor(now.getTime() / 500) % 2 === 0;
  ctx.fillStyle = isBlink ? "#ef4444" : "#7f1d1d";
  ctx.beginPath();
  ctx.arc(w - 280, 40, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px 'JetBrains Mono', monospace";
  ctx.fillText("REC [AI ON]", w - 265, 44);

  ctx.fillStyle = "#38bdf8";
  ctx.fillText(dateStr.slice(0, 23), w - 170, 44);

  // Bottom Bar: Telemetry (FPS, Bitrate, Codec, E2EE, ONVIF Profile)
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(16, h - 38, w - 32, 26);

  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#22c55e";
  ctx.fillText(`● FPS: ${device.fps}.0`, 28, h - 22);

  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`BITRATE: ${device.bitrateKbps} kbps`, 120, h - 22);
  ctx.fillText(`RES: ${device.resolution.split(" ")[0]}`, 280, h - 22);
  ctx.fillText(`CODEC: ${device.codec}`, 420, h - 22);
  ctx.fillText(`LATÊNCIA: 14ms`, 540, h - 22);
  ctx.fillText(`${device.onvifProfile}`, 670, h - 22);

  // E2EE Badge
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`🔒 AES-256 E2EE ATIVO`, w - 180, h - 22);

  // Highlight Warning Banner if Alert
  if (highlightAlert) {
    ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚠ ALERTA CRÍTICO DE INTRUSÃO - PROTOCOLO DE SEGURANÇA ENGILHADO", w / 2, 19);
  }

  ctx.restore();
}
