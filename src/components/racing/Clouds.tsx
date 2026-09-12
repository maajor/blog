"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Clouds() {
  const groupRef = useRef<THREE.Group>(null);
  const clockRef = useRef(0);

  useFrame((_, delta) => {
    clockRef.current += delta;
    if (!groupRef.current) return;
    groupRef.current.children.forEach((cloud, i) => {
      cloud.position.x += Math.sin(clockRef.current * 0.1 + i) * delta * 0.5;
    });
  });

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    let seed = 777;
    const rand = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    // Ground-level atmospheric haze / mist puffs
    const hazeMat = new THREE.MeshStandardMaterial({
      color: "#d4c8b8",
      roughness: 1,
      transparent: true,
      opacity: 0.25,
    });

    for (let i = 0; i < 30; i++) {
      const cx = -400 + rand() * 1400;
      const cz = -500 + rand() * 1600;
      // Low altitude — ground-level mist
      const cy = 2 + rand() * 15;

      const hazeGroup = new THREE.Group();

      const numPuffs = 4 + Math.floor(rand() * 6);
      for (let j = 0; j < numPuffs; j++) {
        const r = 12 + rand() * 25;
        const puffGeom = new THREE.SphereGeometry(r, 8, 6);
        const puff = new THREE.Mesh(puffGeom, hazeMat);
        puff.position.set(
          (rand() - 0.5) * 40,
          (rand() - 0.5) * 4,
          (rand() - 0.5) * 30,
        );
        puff.scale.y = 0.3; // flatten into mist layers
        hazeGroup.add(puff);
      }

      hazeGroup.position.set(cx, cy, cz);
      g.add(hazeGroup);
    }

    // Proper low-poly cumulus clouds — cream white, drifting overhead
    const cloudMat = new THREE.MeshStandardMaterial({
      color: "#ece5d8",
      roughness: 1,
    });

    for (let i = 0; i < 16; i++) {
      const cx = -350 + rand() * 1300;
      const cz = -450 + rand() * 1500;
      const cy = 45 + rand() * 55;

      const cloudGroup = new THREE.Group();
      const numPuffs = 4 + Math.floor(rand() * 4);
      for (let j = 0; j < numPuffs; j++) {
        const r = 8 + rand() * 9;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudMat);
        puff.position.set(
          (rand() - 0.5) * 22,
          (rand() - 0.5) * 3,
          (rand() - 0.5) * 12,
        );
        puff.scale.y = 0.55;
        cloudGroup.add(puff);
      }

      cloudGroup.position.set(cx, cy, cz);
      g.add(cloudGroup);
    }
  }, []);

  return <group ref={groupRef} />;
}
