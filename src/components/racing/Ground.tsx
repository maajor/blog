"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";

export function Ground() {
  return (
    <RigidBody type="fixed" position={[340, -2.5, 480]} colliders={false} friction={1.5}>
      <CuboidCollider args={[1500, 2.5, 1500]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[45, 2.5, 5]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#b8ad9a" roughness={1} />
      </mesh>
    </RigidBody>
  );
}
