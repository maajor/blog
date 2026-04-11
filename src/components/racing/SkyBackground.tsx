"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Procedural skybox — inverted sphere with equirectangular canvas texture.
 * Paints a warm gradient sky, distant hills, mid hills, and atmospheric haze.
 */
export function SkyBackground() {
  const texture = useMemo(() => {
    const W = 2048;
    const H = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Full gradient: zenith → horizon → nadir
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#ddd5c8"); // zenith
    grad.addColorStop(0.38, "#d4c8b8"); // upper sky
    grad.addColorStop(0.5, "#c8bfad"); // horizon
    grad.addColorStop(0.6, "#c4b9a8"); // below horizon
    grad.addColorStop(0.75, "#b8ad9a"); // ground
    grad.addColorStop(1.0, "#a89c88"); // nadir
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Distant hills — subtle, near horizon
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#c4b9a8";
    ctx.beginPath();
    const farBase = H * 0.46;
    ctx.moveTo(0, farBase);
    for (let x = 0; x <= W; x++) {
      const t = x / W;
      const y =
        farBase -
        Math.sin(t * Math.PI * 2) * 14 -
        Math.sin(t * Math.PI * 4 + 1.2) * 8 -
        Math.sin(t * Math.PI * 6 + 2.5) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H * 0.54);
    ctx.lineTo(0, H * 0.54);
    ctx.closePath();
    ctx.fill();

    // Mid hills — stronger, slightly lower
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#b8ad9a";
    ctx.beginPath();
    const midBase = H * 0.50;
    ctx.moveTo(0, midBase);
    for (let x = 0; x <= W; x++) {
      const t = x / W;
      const y =
        midBase -
        Math.sin(t * Math.PI * 2 + 0.8) * 18 -
        Math.sin(t * Math.PI * 3 + 1.5) * 10 -
        Math.sin(t * Math.PI * 5 + 3.0) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H * 0.58);
    ctx.lineTo(0, H * 0.58);
    ctx.closePath();
    ctx.fill();

    // Ground-level atmospheric haze
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#b8ad9a";
    ctx.fillRect(0, H * 0.52, W, H * 0.12);

    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[1500, 64, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
