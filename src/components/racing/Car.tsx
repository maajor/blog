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

const TIRE_WIDTH = 0.32;

export const WheelMesh = () => (
  <group rotation={[0, 0, Math.PI / 2]}>
    {/* tire */}
    <mesh>
      <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, TIRE_WIDTH, 12]} />
      <meshStandardMaterial color={PALETTE.tire} roughness={0.9} />
    </mesh>
    {/* hub, slightly recessed so the sidewall reads */}
    <mesh>
      <cylinderGeometry args={[WHEEL_RADIUS * 0.48, WHEEL_RADIUS * 0.48, TIRE_WIDTH - 0.06, 8]} />
      <meshStandardMaterial color={PALETTE.hub} roughness={0.6} />
    </mesh>
  </group>
);

// Visual body only — no physics. Exported so dev previews can render the
// exact same geometry the in-game Car mounts inside its RigidBody.
export const CarBody = () => {
  const hullGeometry = useMemo(
    () => new BoxGeometry(CAR_WIDTH, 0.55, CAR_LENGTH),
    [],
  );

  return (
    <>
      {/* —— main hull —— */}
      <mesh position={[0, 0.4, 0]} geometry={hullGeometry}>
        <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
      </mesh>
      {/* subtle dark edge on the hull only, echoing the track edge lines */}
      <lineSegments position={[0, 0.4, 0]}>
        <edgesGeometry args={[hullGeometry]} />
        <lineBasicMaterial color={PALETTE.edge} />
      </lineSegments>

      {/* —— wheel arches: modest flares, kept flush with the hull top —— */}
      {([[-1, 1], [1, 1], [-1, -1], [1, -1]] as const).map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * 1.1, 0.535, sz * 1.65]}>
          <boxGeometry args={[0.4, 0.27, 0.95]} />
          <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
        </mesh>
      ))}

      {/* —— dark under-tray: closes off the see-through gap under the hull —— */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.95, 0.18, 4.15]} />
        <meshStandardMaterial color={PALETTE.edge} roughness={0.95} />
      </mesh>

      {/* —— stepped volumes: hood deck / rear deck —— */}
      <mesh position={[0, 0.72, 1.42]}>
        <boxGeometry args={[2.05, 0.15, 1.35]} />
        <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.72, -1.72]}>
        <boxGeometry args={[2.05, 0.15, 0.85]} />
        <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
      </mesh>

      {/* —— cabin —— */}
      <mesh position={[0, 0.925, -0.2]}>
        <boxGeometry args={[1.72, 0.5, 1.85]} />
        <meshStandardMaterial color={PALETTE.cabin} roughness={0.55} />
      </mesh>
      {/* raked windshield */}
      <mesh position={[0, 0.96, 0.82]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[1.62, 0.55, 0.06]} />
        <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
      </mesh>
      {/* raked rear window */}
      <mesh position={[0, 0.96, -1.22]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[1.62, 0.5, 0.06]} />
        <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
      </mesh>
      {/* side windows */}
      <mesh position={[-0.87, 0.94, -0.2]}>
        <boxGeometry args={[0.05, 0.3, 1.45]} />
        <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
      </mesh>
      <mesh position={[0.87, 0.94, -0.2]}>
        <boxGeometry args={[0.05, 0.3, 1.45]} />
        <meshStandardMaterial color={PALETTE.glass} roughness={0.4} />
      </mesh>
      {/* roof cap returns the body color — color blocking */}
      <mesh position={[0, 1.2, -0.2]}>
        <boxGeometry args={[1.8, 0.1, 1.95]} />
        <meshStandardMaterial color={PALETTE.body} roughness={0.6} />
      </mesh>

      {/* —— racing stripe: hood → roof → deck —— */}
      <mesh position={[0, 0.805, 1.42]}>
        <boxGeometry args={[0.4, 0.02, 1.33]} />
        <meshStandardMaterial color={PALETTE.stripe} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.26, -0.2]}>
        <boxGeometry args={[0.4, 0.02, 1.93]} />
        <meshStandardMaterial color={PALETTE.stripe} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.805, -1.72]}>
        <boxGeometry args={[0.4, 0.02, 0.83]} />
        <meshStandardMaterial color={PALETTE.stripe} roughness={0.6} />
      </mesh>

      {/* —— ground-hugging trim band + bumpers —— */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[2.28, 0.12, 4.25]} />
        <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.32, 2.3]}>
        <boxGeometry args={[2.3, 0.24, 0.25]} />
        <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.32, -2.3]}>
        <boxGeometry args={[2.3, 0.24, 0.25]} />
        <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
      </mesh>

      {/* —— lights as flat geometry (DESIGN.md: no colored point lights) —— */}
      <mesh position={[-0.62, 0.5, 2.26]}>
        <boxGeometry args={[0.34, 0.13, 0.05]} />
        <meshStandardMaterial color={PALETTE.headlight} roughness={0.4} />
      </mesh>
      <mesh position={[0.62, 0.5, 2.26]}>
        <boxGeometry args={[0.34, 0.13, 0.05]} />
        <meshStandardMaterial color={PALETTE.headlight} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 2.26]}>
        <boxGeometry args={[0.7, 0.1, 0.05]} />
        <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
      </mesh>
      <mesh position={[-0.62, 0.5, -2.26]}>
        <boxGeometry args={[0.34, 0.13, 0.05]} />
        <meshStandardMaterial color={PALETTE.taillight} roughness={0.5} />
      </mesh>
      <mesh position={[0.62, 0.5, -2.26]}>
        <boxGeometry args={[0.34, 0.13, 0.05]} />
        <meshStandardMaterial color={PALETTE.taillight} roughness={0.5} />
      </mesh>

      {/* —— side mirrors + exhaust —— */}
      <mesh position={[-0.98, 0.98, 0.6]}>
        <boxGeometry args={[0.16, 0.1, 0.05]} />
        <meshStandardMaterial color={PALETTE.cabin} roughness={0.55} />
      </mesh>
      <mesh position={[0.98, 0.98, 0.6]}>
        <boxGeometry args={[0.16, 0.1, 0.05]} />
        <meshStandardMaterial color={PALETTE.cabin} roughness={0.55} />
      </mesh>
      <mesh position={[0.6, 0.22, -2.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
        <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
      </mesh>
    </>
  );
};

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
  // Connection points sit above the chassis origin: the suspension carries
  // the body 0.3 lower, putting the wheel tops just inside the arches.
  const vehicleHeight = 0.3;

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
        {/* Heavy ballast low to the ground (kept clear of the tarmac at the
            lowered ride height) */}
        <CuboidCollider args={[CAR_WIDTH / 2 - 0.1, 0.08, CAR_LENGTH / 2 - 0.3]} position={[0, -0.17, 0]} density={8} />

        {/* visual body — dropped 0.23 below the chassis origin so the
            under-tray sits ~0.15 off the ground */}
        <group position={[0, -0.23, 0]}>
          <CarBody />
        </group>
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
