"use client";

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { TRACK_WIDTH, WALL_HEIGHT, getWallDistance } from "./constants";
import { createTrackCurve } from "./trackCurve";

export function Track() {
  const groupRef = useRef<THREE.Group>(null);
  const curve = useMemo(() => createTrackCurve(), []);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    while (g.children.length > 0) g.remove(g.children[0]);

    const N = 600;

    const left: THREE.Vector3[] = [];
    const right: THREE.Vector3[] = [];
    const wallL: THREE.Vector3[] = [];
    const wallR: THREE.Vector3[] = [];

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const n = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tan)
        .normalize();
      const wd = getWallDistance(t);
      left.push(p.clone().add(n.clone().multiplyScalar(TRACK_WIDTH / 2)));
      right.push(p.clone().add(n.clone().multiplyScalar(-TRACK_WIDTH / 2)));
      wallL.push(p.clone().add(n.clone().multiplyScalar(wd)));
      wallR.push(p.clone().add(n.clone().multiplyScalar(-wd)));
    }

    const buildStrip = (
      a: THREE.Vector3[],
      b: THREE.Vector3[],
      yOff: number,
      color: string,
      extra?: Record<string, unknown>,
    ) => {
      const verts: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= N; i++) {
        verts.push(a[i].x, a[i].y + yOff, a[i].z);
        verts.push(b[i].x, b[i].y + yOff, b[i].z);
      }
      for (let i = 0; i < N; i++) {
        const a0 = i * 2,
          b0 = i * 2 + 1,
          c0 = (i + 1) * 2,
          d0 = (i + 1) * 2 + 1;
        idx.push(a0, b0, c0, b0, d0, c0);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(verts, 3),
      );
      geom.setIndex(idx);
      geom.computeVertexNormals();
      return new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({ color, ...extra }),
      );
    };

    const buildWallStrip = (pts: THREE.Vector3[]) => {
      const verts: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= N; i++) {
        verts.push(pts[i].x, 0, pts[i].z);
        verts.push(pts[i].x, WALL_HEIGHT, pts[i].z);
      }
      for (let i = 0; i < N; i++) {
        const a0 = i * 2,
          b0 = i * 2 + 1,
          c0 = (i + 1) * 2,
          d0 = (i + 1) * 2 + 1;
        idx.push(a0, b0, c0, b0, d0, c0);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(verts, 3),
      );
      geom.setIndex(idx);
      geom.computeVertexNormals();
      return new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({
          color: "#9c9180",
          roughness: 0.9,
          side: THREE.DoubleSide,
        }),
      );
    };

    // Road surface — sand/stone tone
    g.add(
      buildStrip(left, right, 0.05, "#c4b9a8", {
        roughness: 0.8,
      }),
    );

    // Kerb strips (terracotta and cream alternating)
    const KERB_W = 1.2;
    const kerbInnerL: THREE.Vector3[] = [];
    const kerbOuterL: THREE.Vector3[] = [];
    const kerbInnerR: THREE.Vector3[] = [];
    const kerbOuterR: THREE.Vector3[] = [];
    for (let i = 0; i <= N; i++) {
      const kp = curve.getPointAt(i / N);
      const ktan = curve.getTangentAt(i / N);
      const kn = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), ktan)
        .normalize();
      kerbOuterL.push(
        kp.clone().add(kn.clone().multiplyScalar(TRACK_WIDTH / 2)),
      );
      kerbInnerL.push(
        kp.clone().add(
          kn.clone().multiplyScalar(TRACK_WIDTH / 2 - KERB_W),
        ),
      );
      kerbOuterR.push(
        kp.clone().add(kn.clone().multiplyScalar(-TRACK_WIDTH / 2)),
      );
      kerbInnerR.push(
        kp.clone().add(
          kn.clone().multiplyScalar(-TRACK_WIDTH / 2 + KERB_W),
        ),
      );
    }

    const buildKerb = (
      inner: THREE.Vector3[],
      outer: THREE.Vector3[],
    ) => {
      const verts: number[] = [];
      const colors: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= N; i++) {
        verts.push(inner[i].x, inner[i].y + 0.06, inner[i].z);
        verts.push(outer[i].x, outer[i].y + 0.06, outer[i].z);
        const seg = Math.floor((i / N) * 60);
        const isAccent = seg % 2 === 0;
        // terracotta and warm cream
        const r = isAccent ? 0.72 : 0.88;
        const gv = isAccent ? 0.38 : 0.85;
        const b = isAccent ? 0.16 : 0.75;
        colors.push(r, gv, b, r, gv, b);
      }
      for (let i = 0; i < N; i++) {
        const a0 = i * 2,
          b0 = i * 2 + 1,
          c0 = (i + 1) * 2,
          d0 = (i + 1) * 2 + 1;
        idx.push(a0, b0, c0, b0, d0, c0);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(verts, 3),
      );
      geom.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      geom.setIndex(idx);
      geom.computeVertexNormals();
      return new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.9,
          side: THREE.DoubleSide,
        }),
      );
    };
    g.add(buildKerb(kerbInnerL, kerbOuterL));
    g.add(buildKerb(kerbInnerR, kerbOuterR));

    // Grass runoff — slightly darker earth
    g.add(buildStrip(left, wallL, -0.02, "#a89c88", { roughness: 1 }));
    g.add(buildStrip(right, wallR, -0.02, "#a89c88", { roughness: 1 }));

    // Walls
    g.add(buildWallStrip(wallL));
    g.add(buildWallStrip(wallR));

    // Clean dark gray edge lines
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x3a3530,
      transparent: true,
      opacity: 0.6,
    });
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(left),
        edgeMat,
      ),
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(right),
        edgeMat,
      ),
    );

    // Edge marker posts — warm gray
    const postGeom = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 6);
    const postMat = new THREE.MeshStandardMaterial({
      color: "#7a7060",
      roughness: 0.8,
    });
    const tipGeom = new THREE.SphereGeometry(0.2, 6, 4);
    const tipMat = new THREE.MeshStandardMaterial({
      color: "#b8612a",
      roughness: 0.6,
    });
    for (let i = 0; i < 20; i++) {
      const mt = i / 20;
      const mp = curve.getPointAt(mt);
      const mtan = curve.getTangentAt(mt);
      const mn = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), mtan)
        .normalize();
      for (const side of [1, -1]) {
        const mpos = mp
          .clone()
          .add(mn.clone().multiplyScalar(side * (TRACK_WIDTH / 2 + 0.8)));
        const post = new THREE.Mesh(postGeom, postMat);
        post.position.set(mpos.x, 0.5, mpos.z);
        g.add(post);
        const tip = new THREE.Mesh(tipGeom, tipMat);
        tip.position.set(mpos.x, 1.1, mpos.z);
        g.add(tip);
      }
    }

    // Wall top lines
    const wallTopL = wallL.map(
      (p) => new THREE.Vector3(p.x, WALL_HEIGHT, p.z),
    );
    const wallTopR = wallR.map(
      (p) => new THREE.Vector3(p.x, WALL_HEIGHT, p.z),
    );
    const wlMat = new THREE.LineBasicMaterial({
      color: 0x9c9180,
      transparent: true,
      opacity: 0.5,
    });
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(wallTopL),
        wlMat,
      ),
    );
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(wallTopR),
        wlMat,
      ),
    );

    // Centre-line dashes — subtle
    const dashMat = new THREE.LineBasicMaterial({
      color: 0x9c9a95,
      transparent: true,
      opacity: 0.2,
    });
    for (let i = 0; i < 80; i += 2) {
      const t = i / 80;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const n = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tan)
        .normalize();
      g.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            p
              .clone()
              .add(n.clone().multiplyScalar((TRACK_WIDTH / 2) * 0.95)),
            p
              .clone()
              .add(n.clone().multiplyScalar((-TRACK_WIDTH / 2) * 0.95)),
          ]),
          dashMat,
        ),
      );
    }

    // Start / finish line
    const sfP = curve.getPointAt(0);
    const sfT = curve.getTangentAt(0);
    const sfN = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), sfT)
      .normalize();
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          sfP.clone().add(sfN.clone().multiplyScalar(TRACK_WIDTH / 2)),
          sfP
            .clone()
            .add(sfN.clone().multiplyScalar(-TRACK_WIDTH / 2)),
        ]),
        new THREE.LineBasicMaterial({
          color: 0x1a1918,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );

    // Start gate — simplified clean geometric arch
    const gateH = 7;
    const gateW = TRACK_WIDTH + 6;
    const gateOff = sfP.clone().add(sfT.clone().multiplyScalar(-3));
    const gateAngle = Math.atan2(-sfN.z, sfN.x);

    const pillarGeom = new THREE.BoxGeometry(1.2, gateH, 1.2);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: "#9c9180",
      roughness: 0.7,
    });
    for (const side of [1, -1]) {
      const px = gateOff.x + (sfN.x * side * gateW) / 2;
      const pz = gateOff.z + (sfN.z * side * gateW) / 2;
      const pillar = new THREE.Mesh(pillarGeom, pillarMat);
      pillar.position.set(px, gateH / 2, pz);
      g.add(pillar);

      const tipMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 6),
        new THREE.MeshStandardMaterial({
          color: "#b8612a",
          roughness: 0.6,
        }),
      );
      tipMesh.position.set(px, gateH + 0.4, pz);
      g.add(tipMesh);
    }

    // Cross beam
    const beamGeom = new THREE.BoxGeometry(gateW, 1.2, 2.0);
    const beamMat = new THREE.MeshStandardMaterial({
      color: "#a89c88",
      roughness: 0.7,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.set(gateOff.x, gateH, gateOff.z);
    beam.rotation.y = gateAngle;
    g.add(beam);

    const beamEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(beamGeom),
      new THREE.LineBasicMaterial({ color: 0x6b6862 }),
    );
    beamEdges.position.copy(beam.position);
    beamEdges.rotation.copy(beam.rotation);
    g.add(beamEdges);

    // Light panels on beam — warm indicator dots
    const lightGeom = new THREE.SphereGeometry(0.3, 8, 6);
    const lightMatOn = new THREE.MeshStandardMaterial({
      color: "#b8922a",
      roughness: 0.5,
    });
    for (let i = 0; i < 5; i++) {
      const offset = (i - 2) * 2.5;
      const light = new THREE.Mesh(lightGeom, lightMatOn);
      light.position.set(
        gateOff.x + sfN.x * offset,
        gateH + 0.9,
        gateOff.z + sfN.z * offset,
      );
      g.add(light);
    }
  }, [curve]);

  return <group ref={groupRef} />;
}
