"use client";

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { createTrackCurve } from "./trackCurve";
import { TRACK_WIDTH } from "./constants";

export function Minimap({
  carT,
  heading,
}: {
  carT: number;
  heading: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const curve = useMemo(() => createTrackCurve(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    const trackPts: { x: number; z: number }[] = [];
    for (let i = 0; i < 400; i++) {
      const p = curve.getPointAt(i / 400);
      trackPts.push({ x: p.x, z: p.z });
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const padX = (maxX - minX) * 0.15;
    const padZ = (maxZ - minZ) * 0.15;
    minX -= padX;
    maxX += padX;
    minZ -= padZ;
    maxZ += padZ;

    const scaleX = W / (maxX - minX);
    const scaleZ = H / (maxZ - minZ);
    const scale = Math.min(scaleX, scaleZ);
    const offX = (W - (maxX - minX) * scale) / 2;
    const offZ = (H - (maxZ - minZ) * scale) / 2;

    const toScreen = (x: number, z: number) => ({
      sx: (x - minX) * scale + offX,
      sy: (z - minZ) * scale + offZ,
    });

    // Background
    ctx.fillStyle = "rgba(26, 25, 24, 0.7)";
    ctx.fillRect(0, 0, W, H);

    // Track outline — muted stroke
    ctx.strokeStyle = "rgba(156, 145, 128, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= trackPts.length; i++) {
      const pt = trackPts[i % trackPts.length];
      const { sx, sy } = toScreen(pt.x, pt.z);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();

    // Start line
    const sp = curve.getPointAt(0);
    const st = curve.getTangentAt(0);
    const sn = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), st)
      .normalize();
    const s1 = toScreen(
      sp.x + sn.x * TRACK_WIDTH / 2,
      sp.z + sn.z * TRACK_WIDTH / 2,
    );
    const s2 = toScreen(
      sp.x - sn.x * TRACK_WIDTH / 2,
      sp.z - sn.z * TRACK_WIDTH / 2,
    );
    ctx.strokeStyle = "rgba(26, 25, 24, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s1.sx, s1.sy);
    ctx.lineTo(s2.sx, s2.sy);
    ctx.stroke();

    // Car position — terracotta dot
    const carPos = curve.getPointAt(carT);
    const { sx, sy } = toScreen(carPos.x, carPos.z);

    ctx.fillStyle = "#b8612a";
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Heading indicator
    const arrowLen = 8;
    const ax = sx + Math.sin(heading) * arrowLen;
    const ay = sy + Math.cos(heading) * arrowLen;
    ctx.strokeStyle = "#8a9a7b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ax, ay);
    ctx.stroke();
  }, [carT, heading, curve]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={160}
      className="absolute top-16 right-4 rounded-md border border-[var(--border)]"
      style={{ background: "transparent" }}
    />
  );
}
