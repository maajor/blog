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

// All colors from DESIGN.md "Game Visual Direction" — flat warm palette, no emissive
const PALETTE = {
  body: "#b8612a", // burnt sienna — the personality carrier
  cabin: "#9c5020", // darker sienna
  stripe: "#e8d9c0", // warm cream
  glass: "#4a4038", // warm dark brown-gray
  trim: "#5f5648", // warm gray (bumpers, skirts, grille)
  headlight: "#f2e8d5",
  taillight: "#a63d2f",
  tire: "#2a2520",
  hub: "#9c9180", // building warm gray
  edge: "#3a3025",
} as const;

const WheelMesh = () => (
  <group rotation={[0, 0, Math.PI / 2]}>
    {/* tire */}
    <mesh>
      <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.24, 12]} />
      <meshStandardMaterial color={PALETTE.tire} roughness={0.9} />
    </mesh>
    {/* hub, slightly recessed so the sidewall reads */}
    <mesh>
      <cylinderGeometry args={[WHEEL_RADIUS * 0.48, WHEEL_RADIUS * 0.48, 0.18, 8]} />
      <meshStandardMaterial color={PALETTE.hub} roughness={0.6} />
    </mesh>
  </group>
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

  const hullGeometry = useMemo(
    () => new BoxGeometry(CAR_WIDTH, 0.42, CAR_LENGTH),
    [],
  );

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

        {/* —— main hull —— */}
        <mesh position={[0, 0.33, 0]} geometry={hullGeometry}>
          <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
        </mesh>
        {/* subtle dark edge on the hull only, echoing the track edge lines */}
        <lineSegments position={[0, 0.33, 0]}>
          <edgesGeometry args={[hullGeometry]} />
          <lineBasicMaterial color={PALETTE.edge} />
        </lineSegments>

        {/* —— stepped volumes: hood deck / rear deck —— */}
        <mesh position={[0, 0.6, 1.45]}>
          <boxGeometry args={[2.0, 0.14, 1.3]} />
          <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.6, -1.75]}>
          <boxGeometry args={[2.0, 0.14, 0.8]} />
          <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
        </mesh>

        {/* —— cabin —— */}
        <mesh position={[0, 0.75, -0.2]}>
          <boxGeometry args={[1.7, 0.42, 1.8]} />
          <meshStandardMaterial color={PALETTE.cabin} roughness={0.55} />
        </mesh>
        {/* raked windshield */}
        <mesh position={[0, 0.78, 0.78]} rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[1.6, 0.5, 0.06]} />
          <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
        </mesh>
        {/* raked rear window */}
        <mesh position={[0, 0.78, -1.18]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[1.6, 0.44, 0.06]} />
          <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
        </mesh>
        {/* side windows */}
        <mesh position={[-0.86, 0.76, -0.2]}>
          <boxGeometry args={[0.05, 0.26, 1.4]} />
          <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
        </mesh>
        <mesh position={[0.86, 0.76, -0.2]}>
          <boxGeometry args={[0.05, 0.26, 1.4]} />
          <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
        </mesh>
        {/* roof cap returns the body color — color blocking */}
        <mesh position={[0, 1.0, -0.2]}>
          <boxGeometry args={[1.78, 0.09, 1.9]} />
          <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
        </mesh>

        {/* —— racing stripe: hood → roof → deck —— */}
        <mesh position={[0, 0.68, 1.45]}>
          <boxGeometry args={[0.4, 0.02, 1.28]} />
          <meshStandardMaterial color={PALETTE.stripe} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.05, -0.2]}>
          <boxGeometry args={[0.4, 0.02, 1.88]} />
          <meshStandardMaterial color={PALETTE.stripe} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.68, -1.75]}>
          <boxGeometry args={[0.4, 0.02, 0.78]} />
          <meshStandardMaterial color={PALETTE.stripe} roughness={0.6} />
        </mesh>

        {/* —— ground-hugging trim band + bumpers —— */}
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[2.26, 0.1, 3.7]} />
          <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.3, 2.3]}>
          <boxGeometry args={[2.26, 0.2, 0.22]} />
          <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.3, -2.3]}>
          <boxGeometry args={[2.26, 0.2, 0.22]} />
          <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
        </mesh>

        {/* —— lights as flat geometry (DESIGN.md: no colored point lights) —— */}
        <mesh position={[-0.62, 0.45, 2.26]}>
          <boxGeometry args={[0.34, 0.12, 0.05]} />
          <meshStandardMaterial color={PALETTE.headlight} roughness={0.4} />
        </mesh>
        <mesh position={[0.62, 0.45, 2.26]}>
          <boxGeometry args={[0.34, 0.12, 0.05]} />
          <meshStandardMaterial color={PALETTE.headlight} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.45, 2.26]}>
          <boxGeometry args={[0.7, 0.1, 0.05]} />
          <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
        </mesh>
        <mesh position={[-0.62, 0.45, -2.26]}>
          <boxGeometry args={[0.34, 0.12, 0.05]} />
          <meshStandardMaterial color={PALETTE.taillight} roughness={0.5} />
        </mesh>
        <mesh position={[0.62, 0.45, -2.26]}>
          <boxGeometry args={[0.34, 0.12, 0.05]} />
          <meshStandardMaterial color={PALETTE.taillight} roughness={0.5} />
        </mesh>

        {/* —— side mirrors + exhaust —— */}
        <mesh position={[-0.95, 0.85, 0.55]}>
          <boxGeometry args={[0.16, 0.1, 0.05]} />
          <meshStandardMaterial color={PALETTE.cabin} roughness={0.55} />
        </mesh>
        <mesh position={[0.95, 0.85, 0.55]}>
          <boxGeometry args={[0.16, 0.1, 0.05]} />
          <meshStandardMaterial color={PALETTE.cabin} roughness={0.55} />
        </mesh>
        <mesh position={[0.6, 0.2, -2.42]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
          <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
        </mesh>
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
