"use client";

import { CuboidCollider, type RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { type RefObject, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { BoxGeometry, type Group, Object3D, Vector3 } from "three";
import {
  CAR_WIDTH,
  CAR_LENGTH,
  WHEEL_RADIUS,
  WHEEL_SUSPENSION_REST,
  WHEEL_SUSPENSION_STIFFNESS,
  WHEEL_MAX_SUSPENSION_TRAVEL,
  WHEEL_MAX_SUSPENSION_FORCE,
  WHEEL_FRICTION_SLIP,
  WHEEL_DAMPING_RELAXATION,
  WHEEL_DAMPING_COMPRESSION,
  WHEEL_ROLL_INFLUENCE,
  WHEEL_SIDE_FRICTION,
  WHEEL_FORWARD_ACCEL,
  WHEEL_SIDE_ACCEL,
  WHEEL_CUSTOM_SLIDING_ROT_SPEED,
  VEHICLE_MASS,
} from "./constants";
import { RapierRaycastVehicle, type WheelOptions } from "@/lib/rapier-raycast-vehicle";

type RaycastVehicleWheel = {
  options: WheelOptions;
  object: RefObject<Object3D>;
};

export type VehicleRef = {
  chassisRigidBody: RefObject<RapierRigidBody>;
  rapierRaycastVehicle: RefObject<RapierRaycastVehicle>;
  wheels: RaycastVehicleWheel[];
};

const WheelMesh = () => (
  <mesh rotation={[0, 0, Math.PI / 2]}>
    <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.2, 8]} />
    <meshStandardMaterial color="#2a2520" roughness={0.8} />
  </mesh>
);

export const Car = forwardRef<VehicleRef>((_props, ref) => {
  const rapier = useRapier();

  const vehicleRef = useRef<RapierRaycastVehicle>(null!);
  const chassisRigidBodyRef = useRef<RapierRigidBody>(null!);

  const flWheelObject = useRef<Group>(null!);
  const frWheelObject = useRef<Group>(null!);
  const rlWheelObject = useRef<Group>(null!);
  const rrWheelObject = useRef<Group>(null!);

  const directionLocal = useMemo(() => new Vector3(0, -1, 0), []);
  const axleLocal = useMemo(() => new Vector3(1, 0, 0), []);

  const vehicleWidth = CAR_WIDTH / 2 + 0.1;
  const vehicleFront = CAR_LENGTH / 2 - 0.6;
  const vehicleBack = -CAR_LENGTH / 2 + 0.6;
  const vehicleHeight = 0;

  const commonWheelOptions = useMemo(
    () => ({
      radius: WHEEL_RADIUS,
      directionLocal,
      axleLocal,
      suspensionStiffness: WHEEL_SUSPENSION_STIFFNESS,
      suspensionRestLength: WHEEL_SUSPENSION_REST,
      maxSuspensionForce: WHEEL_MAX_SUSPENSION_FORCE,
      maxSuspensionTravel: WHEEL_MAX_SUSPENSION_TRAVEL,
      sideFrictionStiffness: WHEEL_SIDE_FRICTION,
      frictionSlip: WHEEL_FRICTION_SLIP,
      dampingRelaxation: WHEEL_DAMPING_RELAXATION,
      dampingCompression: WHEEL_DAMPING_COMPRESSION,
      rollInfluence: WHEEL_ROLL_INFLUENCE,
      customSlidingRotationalSpeed: WHEEL_CUSTOM_SLIDING_ROT_SPEED,
      useCustomSlidingRotationalSpeed: true,
      forwardAcceleration: WHEEL_FORWARD_ACCEL,
      sideAcceleration: WHEEL_SIDE_ACCEL,
    }),
    [directionLocal, axleLocal],
  );

  const wheels: RaycastVehicleWheel[] = useMemo(
    () => [
      {
        // front-left (steering)
        object: flWheelObject,
        options: {
          ...commonWheelOptions,
          chassisConnectionPointLocal: new Vector3(-vehicleWidth, vehicleHeight, vehicleFront),
        },
      },
      {
        // front-right (steering)
        object: frWheelObject,
        options: {
          ...commonWheelOptions,
          chassisConnectionPointLocal: new Vector3(vehicleWidth, vehicleHeight, vehicleFront),
        },
      },
      {
        // rear-left (drive)
        object: rlWheelObject,
        options: {
          ...commonWheelOptions,
          chassisConnectionPointLocal: new Vector3(-vehicleWidth, vehicleHeight, vehicleBack),
        },
      },
      {
        // rear-right (drive)
        object: rrWheelObject,
        options: {
          ...commonWheelOptions,
          chassisConnectionPointLocal: new Vector3(vehicleWidth, vehicleHeight, vehicleBack),
        },
      },
    ],
    [commonWheelOptions, vehicleBack, vehicleFront, vehicleWidth],
  );

  useImperativeHandle(ref, () => ({
    chassisRigidBody: chassisRigidBodyRef,
    rapierRaycastVehicle: vehicleRef,
    wheels,
  }));

  useEffect(() => {
    vehicleRef.current = new RapierRaycastVehicle({
      world: rapier.world,
      chassisRigidBody: chassisRigidBodyRef.current!,
      indexRightAxis: 0, // X
      indexForwardAxis: 2, // Z
      indexUpAxis: 1, // Y
    });

    for (const wheel of wheels) {
      vehicleRef.current.addWheel(wheel.options);
    }
  }, [rapier.world, wheels]);

  return (
    <>
      <RigidBody
        ref={chassisRigidBodyRef}
        colliders={false}
        mass={VEHICLE_MASS}
        linearDamping={0.5}
        angularDamping={1}
      >
        <CuboidCollider args={[CAR_WIDTH / 2, 0.35, CAR_LENGTH / 2]} position={[0, 0.2, 0]} />
        {/* Heavy ballast low to the ground */}
        <CuboidCollider args={[CAR_WIDTH / 2 - 0.1, 0.08, CAR_LENGTH / 2 - 0.3]} position={[0, -0.5, 0]} density={8} />

        {/* body */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[CAR_WIDTH, 0.5, CAR_LENGTH]} />
          <meshStandardMaterial color="#b8612a" roughness={0.6} />
        </mesh>
        {/* cabin */}
        <mesh position={[0, 0.6, -0.3]}>
          <boxGeometry args={[CAR_WIDTH * 0.8, 0.4, CAR_LENGTH * 0.4]} />
          <meshStandardMaterial color="#9c5020" roughness={0.5} />
        </mesh>
        {/* clean edge lines — dark gray, no neon */}
        <lineSegments position={[0, 0.3, 0]}>
          <edgesGeometry args={[new BoxGeometry(CAR_WIDTH, 0.5, CAR_LENGTH)]} />
          <lineBasicMaterial color="#3a3025" />
        </lineSegments>
        {/* headlights — warm white */}
        <pointLight
          position={[0, 0.5, CAR_LENGTH / 2]}
          color="#f5e6d0"
          intensity={3}
          distance={40}
        />
        {/* tail lights — subtle red */}
        <pointLight
          position={[-0.5, 0.5, -CAR_LENGTH / 2]}
          color="#a63d2f"
          intensity={1}
          distance={10}
        />
        <pointLight
          position={[0.5, 0.5, -CAR_LENGTH / 2]}
          color="#a63d2f"
          intensity={1}
          distance={10}
        />
      </RigidBody>

      {/* Wheels — positioned by raycast vehicle physics */}
      <group ref={flWheelObject}>
        <WheelMesh />
      </group>
      <group ref={frWheelObject}>
        <WheelMesh />
      </group>
      <group ref={rlWheelObject}>
        <WheelMesh />
      </group>
      <group ref={rrWheelObject}>
        <WheelMesh />
      </group>
    </>
  );
});

Car.displayName = "Car";
