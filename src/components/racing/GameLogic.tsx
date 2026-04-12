"use client";

import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep } from "@react-three/rapier";
import * as THREE from "three";
import {
  TOTAL_LAPS,
  MAX_ENGINE_FORCE,
  MAX_STEER_VALUE,
  MAX_BRAKE_FORCE,
  OFFTRACK_HALF_WIDTH,
  OFFTRACK_DRAG,
  OFFTRACK_ENGINE_MULT,
} from "./constants";
import { createTrackCurve } from "./trackCurve";
import type { GameState, LapTime } from "./types";
import type { VehicleRef } from "./Car";
import { useKeyboardControls, type Controls } from "./use-controls";
import {
  trackGameStart,
  trackLapComplete,
  trackRaceComplete,
  trackGameReset,
} from "@/lib/analytics";

export function GameLogic({
  vehicleRef,
  onStateChange,
  resetSignal,
  controls,
  respawnSignal,
}: {
  vehicleRef: React.RefObject<VehicleRef | null>;
  onStateChange: (s: GameState) => void;
  resetSignal: number;
  controls: React.RefObject<Controls>;
  respawnSignal: number;
}) {
  useKeyboardControls(controls);
  const curve = useRef<THREE.CatmullRomCurve3 | null>(null);
  const samples = useRef<THREE.Vector3[]>([]);
  const laps = useRef(0);
  const lastT = useRef(0);
  const raceDone = useRef(false);
  const raceStarted = useRef(false);
  const lapStartTime = useRef(0);
  const gameClock = useRef(0);
  const lapTimes = useRef<LapTime[]>([]);
  const prevHalf = useRef(0);
  const resetRequested = useRef(true);
  const respawnRequested = useRef(false);
  const offTrack = useRef(false);
  const wrongDir = useRef(false);
  const nextCheckpoint = useRef(0);

  const CHECKPOINTS = [0.25, 0.5, 0.75];

  // init curve
  useEffect(() => {
    const c = createTrackCurve();
    curve.current = c;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 2000; i++) pts.push(c.getPointAt(i / 2000));
    samples.current = pts;
  }, []);

  // handle external reset (full restart from UI button)
  useEffect(() => {
    if (resetSignal === 0) return;
    resetRequested.current = true;
  }, [resetSignal]);

  // handle external respawn (from touch button)
  useEffect(() => {
    if (respawnSignal === 0) return;
    respawnRequested.current = true;
  }, [respawnSignal]);

  // R key = respawn at nearest track point, Enter = full race restart
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        respawnRequested.current = true;
      }
      if (e.key === "Enter") {
        resetRequested.current = true;
      }
    };
    window.addEventListener("keydown", dn);
    return () => window.removeEventListener("keydown", dn);
  }, []);

  const doReset = useCallback(() => {
    const chassis = vehicleRef.current?.chassisRigidBody.current;
    if (!chassis || !curve.current) return;
    const lapsBeforeReset = laps.current;
    const p0 = curve.current.getPointAt(0);
    const t0 = curve.current.getTangentAt(0);
    const heading = Math.atan2(t0.x, t0.z);
    const quat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      heading,
    );
    chassis.setTranslation({ x: p0.x, y: 1, z: p0.z }, true);
    chassis.setRotation(quat, true);
    chassis.setLinvel({ x: 0, y: 0, z: 0 }, true);
    chassis.setAngvel({ x: 0, y: 0, z: 0 }, true);
    laps.current = 0;
    lastT.current = 0;
    raceDone.current = false;
    raceStarted.current = false;
    lapStartTime.current = 0;
    gameClock.current = 0;
    lapTimes.current = [];
    prevHalf.current = 0;
    nextCheckpoint.current = 0;
    resetRequested.current = false;
    respawnRequested.current = false;
    trackGameReset(lapsBeforeReset);
  }, [vehicleRef]);

  // nearest curve point
  const nearest = useCallback(
    (pos: THREE.Vector3): { t: number; dist: number; pt: THREE.Vector3 } => {
      let best = 0;
      let min = Infinity;
      for (let i = 0; i < samples.current.length; i++) {
        const s = samples.current[i];
        const dx = pos.x - s.x;
        const dz = pos.z - s.z;
        const d = dx * dx + dz * dz;
        if (d < min) {
          min = d;
          best = i;
        }
      }
      const t = best / samples.current.length;
      const pt = curve.current!.getPointAt(t);
      return { t, dist: Math.sqrt(min), pt };
    },
    [],
  );

  // Respawn: teleport car to nearest track point, keep race state
  const doRespawn = useCallback(() => {
    const chassis = vehicleRef.current?.chassisRigidBody.current;
    if (!chassis || !curve.current) return;
    const carPos = new THREE.Vector3().copy(
      chassis.translation() as THREE.Vector3,
    );
    const { t } = nearest(carPos);
    const pt = curve.current.getPointAt(t);
    const tan = curve.current.getTangentAt(t);
    const heading = Math.atan2(tan.x, tan.z);
    const quat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      heading,
    );
    chassis.setTranslation({ x: pt.x, y: 1, z: pt.z }, true);
    chassis.setRotation(quat, true);
    chassis.setLinvel({ x: 0, y: 0, z: 0 }, true);
    chassis.setAngvel({ x: 0, y: 0, z: 0 }, true);
    respawnRequested.current = false;
  }, [vehicleRef, nearest]);

  // Physics step: apply vehicle forces
  useBeforePhysicsStep(() => {
    if (resetRequested.current) doReset();
    if (respawnRequested.current) doRespawn();
    if (!vehicleRef.current?.rapierRaycastVehicle.current) return;

    const {
      wheels,
      rapierRaycastVehicle: { current: vehicle },
      chassisRigidBody,
    } = vehicleRef.current;

    const chassis = chassisRigidBody.current;
    if (!chassis) return;

    // Check off-track
    const carPos = new THREE.Vector3().copy(
      chassis.translation() as THREE.Vector3,
    );
    const { dist: trackDist } = nearest(carPos);
    const isOffTrack = trackDist > OFFTRACK_HALF_WIDTH;
    offTrack.current = isOffTrack;

    if (isOffTrack) {
      // Apply drag: reduce velocity each step
      const vel = chassis.linvel() as THREE.Vector3;
      chassis.setLinvel(
        { x: vel.x * OFFTRACK_DRAG, y: vel.y, z: vel.z * OFFTRACK_DRAG },
        true,
      );
      // Also damp angular velocity to reduce spinning
      const angVel = chassis.angvel() as THREE.Vector3;
      chassis.setAngvel(
        { x: angVel.x * 0.95, y: angVel.y * 0.95, z: angVel.z * 0.95 },
        true,
      );
    }

    // Apply engine/steering/brake from controls
    let engineForce = 0;
    let steering = 0;

    if (controls.current.forward) engineForce = MAX_ENGINE_FORCE;
    if (isOffTrack) engineForce *= OFFTRACK_ENGINE_MULT;
    if (controls.current.left) steering += MAX_STEER_VALUE;
    if (controls.current.right) steering -= MAX_STEER_VALUE;

    // Reduce steering authority while braking to prevent overly sharp turns
    if (controls.current.brake) steering *= 0.1;

    const brakeForce = controls.current.brake ? MAX_BRAKE_FORCE : 0;

    // brake all wheels
    // for (let i = 0; i < vehicle.wheels.length; i++) {
      // vehicle.setBrakeValue(brakeForce, i);
    // }
    vehicle.setBrakeValue(brakeForce, 3);
    vehicle.setBrakeValue(brakeForce, 2);

    // steer front wheels (0, 1)
    vehicle.setSteeringValue(steering, 0);
    vehicle.setSteeringValue(steering, 1);

    // drive rear wheels (2, 3)
    vehicle.applyEngineForce(engineForce, 1);
    vehicle.applyEngineForce(engineForce, 0);
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);

    // update vehicle physics
    vehicle.update(1 / 60);

    // update wheel visual positions
    for (let i = 0; i < vehicle.wheels.length; i++) {
      const wheelObject = wheels[i].object.current;
      if (!wheelObject) continue;
      const wheelState = vehicle.wheels[i].state;
      wheelObject.position.copy(wheelState.worldTransform.position);
      wheelObject.quaternion.copy(wheelState.worldTransform.quaternion);
    }

    // Auto-start race on first input
    if (
      (controls.current.forward || controls.current.brake) &&
      !raceStarted.current
    ) {
      raceStarted.current = true;
      lapStartTime.current = gameClock.current;
      trackGameStart();
    }
  });

  // Game state update (lap counting, timing)
  useFrame((_state, delta) => {
    const chassis = vehicleRef.current?.chassisRigidBody.current;
    if (!chassis || !curve.current) return;

    const dt = Math.min(delta, 0.05);

    // Game clock
    if (raceStarted.current && !raceDone.current) {
      gameClock.current += dt * 1000;
    }

    // Track position for lap counting
    const carPos = new THREE.Vector3().copy(
      chassis.translation() as THREE.Vector3,
    );
    const { t } = nearest(carPos);

    // Detect wrong direction: compare velocity with track tangent
    const tangent = curve.current.getTangentAt(t);
    const vel = chassis.linvel() as THREE.Vector3;
    const hSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const isWrongDir =
      hSpeed > 2 &&
      tangent.x * vel.x + tangent.z * vel.z < 0;
    wrongDir.current = isWrongDir;

    // Checkpoint detection (must pass in forward order)
    if (
      raceStarted.current &&
      nextCheckpoint.current < CHECKPOINTS.length
    ) {
      const cp = CHECKPOINTS[nextCheckpoint.current];
      if (lastT.current <= cp && t > cp) {
        nextCheckpoint.current++;
      }
    }

    // Lap counting — only when all checkpoints passed AND car crosses start line
    const curHalf = t > 0.5 ? 1 : 0;
    if (
      raceStarted.current &&
      prevHalf.current === 1 &&
      curHalf === 0 &&
      nextCheckpoint.current >= CHECKPOINTS.length &&
      !raceDone.current
    ) {
      const lapTime = gameClock.current - lapStartTime.current;
      lapTimes.current.push({ lap: laps.current + 1, time: lapTime });
      laps.current++;
      lapStartTime.current = gameClock.current;
      nextCheckpoint.current = 0;
      trackLapComplete(laps.current, lapTime);
      if (laps.current >= TOTAL_LAPS) {
        raceDone.current = true;
        const bestLap = Math.min(...lapTimes.current.map((l) => l.time));
        trackRaceComplete(gameClock.current, bestLap);
      }
    }
    prevHalf.current = curHalf;
    lastT.current = t;

    // Heading from chassis rotation
    const chassisRot = chassis.rotation() as THREE.Quaternion;
    const euler = new THREE.Euler().setFromQuaternion(chassisRot);
    const heading = euler.y;

    // Speed from vehicle state
    const vehicle = vehicleRef.current?.rapierRaycastVehicle.current;
    const speed = vehicle
      ? Math.abs(vehicle.state.currentVehicleSpeedKmHour)
      : 0;

    const currentLapTime =
      raceStarted.current && !raceDone.current
        ? gameClock.current - lapStartTime.current
        : 0;
    const totalTime = gameClock.current;
    const bestLapTime =
      lapTimes.current.length > 0
        ? Math.min(...lapTimes.current.map((l) => l.time))
        : 0;

    onStateChange({
      speed,
      lapCount: laps.current,
      raceComplete: raceDone.current,
      raceStarted: raceStarted.current,
      currentLapTime,
      lapTimes: [...lapTimes.current],
      bestLapTime,
      totalTime,
      carT: t,
      heading,
      offTrack: offTrack.current,
      wrongDirection: wrongDir.current,
    });
  });

  return null;
}
