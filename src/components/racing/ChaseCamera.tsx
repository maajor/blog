"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VehicleRef } from "./Car";
import { AFTER_RAPIER_UPDATE } from "./constants";

const _chassisTranslation = new THREE.Vector3();
const _chassisRotation = new THREE.Quaternion();
const _cameraIdealOffset = new THREE.Vector3();
const _cameraIdealLookAt = new THREE.Vector3();

export function ChaseCamera({
  vehicleRef,
}: {
  vehicleRef: React.RefObject<VehicleRef | null>;
}) {
  const { camera } = useThree();
  const sPos = useRef(new THREE.Vector3(0, 3, -6));
  const sTgt = useRef(new THREE.Vector3(0, 0, 5));

  useFrame((_, delta) => {
    const chassis = vehicleRef.current?.chassisRigidBody.current;
    if (!chassis) return;

    _chassisRotation.copy(chassis.rotation() as THREE.Quaternion);
    _chassisTranslation.copy(chassis.translation() as THREE.Vector3);

    const t = 1.0 - Math.pow(0.01, delta);

    _cameraIdealOffset.set(0, 3.5, -7);
    _cameraIdealOffset.applyQuaternion(_chassisRotation);
    _cameraIdealOffset.add(_chassisTranslation);

    if (_cameraIdealOffset.y < 0.5) {
      _cameraIdealOffset.y = 0.5;
    }

    _cameraIdealLookAt.set(0, 1, 14);
    _cameraIdealLookAt.applyQuaternion(_chassisRotation);
    _cameraIdealLookAt.add(_chassisTranslation);

    sPos.current.lerp(_cameraIdealOffset, t);
    sTgt.current.lerp(_cameraIdealLookAt, t);

    camera.position.copy(sPos.current);
    camera.lookAt(sTgt.current);
  }, AFTER_RAPIER_UPDATE);

  return null;
}
