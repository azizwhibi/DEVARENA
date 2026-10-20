'use client';
import { useEffect, useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SphereGeometry, CylinderGeometry, TorusGeometry, MeshStandardMaterial, type BufferGeometry, type Material } from 'three';
import { useByteAnimation } from './useByteAnimation';
import type { ByteGesture, Direction } from './types';

type RobotResources = { sphere: SphereGeometry; cylinder: CylinderGeometry; palm: RoundedBoxGeometry; edge: MeshStandardMaterial; graphite: MeshStandardMaterial; cyan: MeshStandardMaterial };
  function Joint({ r, at, scale = .15 }: { r: RobotResources; at: [number, number, number]; scale?: number }) { return <mesh geometry={r.sphere} material={r.edge} position={at} scale={scale} />; }
  function Segment({ r, at, scale, glow = false, rotation = 0 }: { r: RobotResources; at: [number, number, number]; scale: [number, number, number]; glow?: boolean; rotation?: number }) { return <mesh geometry={r.cylinder} material={glow ? r.cyan : r.graphite} position={at} scale={scale} rotation-z={rotation} />; }
  function Hand({ r, side }: { r: RobotResources; side: number }) { return <group>
    <mesh geometry={r.palm} material={r.edge} />
    {[-1, 0, 1].map(finger => <mesh key={finger} geometry={r.cylinder} material={r.graphite} position={[finger * .075, -.22, 0]} scale={[.032, .2, .032]} rotation-z={finger * -.12} />)}
    <mesh geometry={r.sphere} material={r.edge} position={[side * -.17, -.025, .02]} scale={[.065, .12, .065]} rotation-z={side * -.5} />
  </group>; }

export function ByteCharacter({ gesture = 'idle', direction = { x: -1, y: .3 }, active = true }: { gesture?: ByteGesture; direction?: Direction; active?: boolean }) {
  const { body, head, gaze, eyes, leftArm, rightArm, leftElbow, rightElbow, rightHand, propulsion } = useByteAnimation(gesture, direction, active);
  const resources = useMemo(() => ({
    sphere: new SphereGeometry(1, 20, 14), cylinder: new CylinderGeometry(1, 1, 1, 20), ring: new TorusGeometry(.44, .065, 8, 32),
    head: new RoundedBoxGeometry(1.85, 1.25, 1.12, 4, .23), visor: new RoundedBoxGeometry(1.58, .72, .13, 4, .18),
    torso: new RoundedBoxGeometry(1.23, .86, .85, 3, .18), palm: new RoundedBoxGeometry(.25, .3, .2, 2, .07),
    graphite: new MeshStandardMaterial({ color: '#303c50', metalness: .48, roughness: .32 }),
    edge: new MeshStandardMaterial({ color: '#76849b', metalness: .65, roughness: .3 }),
    black: new MeshStandardMaterial({ color: '#070e1a', metalness: .15, roughness: .22 }),
    cyan: new MeshStandardMaterial({ color: '#a5f3fc', emissive: '#22d3ee', emissiveIntensity: 1.5, roughness: .3 }),
    violet: new MeshStandardMaterial({ color: '#a78bfa', emissive: '#7c3aed', emissiveIntensity: .8, roughness: .4 }),
  }), []);
  useEffect(() => () => { Object.values(resources).forEach(resource => (resource as BufferGeometry | Material).dispose()); }, [resources]);
  const r = resources;
  return <group ref={body} dispose={null} rotation={[.02, -.12, 0]}>
    <group ref={head} position={[0, .92, 0]}>
      <mesh geometry={r.head} material={r.graphite} />
      <mesh geometry={r.visor} material={r.edge} position={[0, .03, .535]} scale={[1.035, 1.07, 1]} />
      <mesh geometry={r.visor} material={r.black} position={[0, .03, .58]} />
      <group ref={gaze} position={[0, .06, .67]}><group ref={eyes}>
        {[-1, 1].map(side => <group key={side} position={[side * .38, 0, 0]}>
          <mesh geometry={r.sphere} material={r.cyan} scale={[.15, .2, .065]} />
          <mesh geometry={r.sphere} material={r.black} position={[.015, .01, .058]} scale={[.048, .085, .018]} />
          <mesh geometry={r.sphere} material={r.cyan} position={[.035, .055, .074]} scale={.025} />
        </group>)}
      </group></group>
      <Segment r={r} at={[0, -.21, .67]} scale={[.018, .18, .018]} glow rotation={Math.PI / 2} />
      {[-1, 1].map(side => <group key={side} position={[side * .99, .04, 0]}>
        <mesh geometry={r.palm} material={r.violet} scale={[.5, 1.7, 1.8]} rotation-z={side * -.22} />
        <Joint r={r} at={[0, 0, 0]} scale={.13} />
      </group>)}
      <Segment r={r} at={[.35, .77, -.08]} scale={[.035, .4, .035]} rotation={-.25} />
      <mesh geometry={r.sphere} material={r.violet} position={[.4, .99, -.08]} scale={.09} />
    </group>
    <Joint r={r} at={[0, .15, 0]} scale={.22} />
    <mesh geometry={r.torso} material={r.graphite} position={[0, -.18, 0]} />
    <mesh geometry={r.torso} material={r.black} position={[0, -.18, .42]} scale={[.78, .65, .12]} />
    <group position={[0, -.18, .5]}>
      <Segment r={r} at={[-.27, .07, 0]} scale={[.022, .22, .022]} glow rotation={-.85} />
      <Segment r={r} at={[-.27, -.07, 0]} scale={[.022, .22, .022]} glow rotation={.85} />
      <Segment r={r} at={[.27, .07, 0]} scale={[.022, .22, .022]} glow rotation={.85} />
      <Segment r={r} at={[.27, -.07, 0]} scale={[.022, .22, .022]} glow rotation={-.85} />
      <Segment r={r} at={[0, 0, 0]} scale={[.023, .39, .023]} glow rotation={-.35} />
    </group>
    {([-1, 1] as const).map(side => <group key={side} position={[side * .75, .02, 0]} ref={side === -1 ? leftArm : rightArm}>
      <Joint r={r} at={[0, 0, 0]} scale={.19} />
      <mesh geometry={r.sphere} material={r.violet} scale={.12} position={[0, 0, .14]} />
      <Segment r={r} at={[0, -.3, 0]} scale={[.12, .42, .12]} />
      <group position={[0, -.56, 0]} ref={side === -1 ? leftElbow : rightElbow}>
        <Joint r={r} at={[0, 0, 0]} scale={.125} />
        <Segment r={r} at={[0, -.22, 0]} scale={[.09, .32, .09]} />
        <group position={[0, -.5, 0]} ref={side === 1 ? rightHand : undefined}><Hand r={r} side={side} /></group>
      </group>
    </group>)}
    <mesh geometry={r.cylinder} material={r.black} position={[0, -.76, 0]} scale={[.4, .19, .4]} />
    <mesh geometry={r.ring} material={r.violet} position={[0, -.77, 0]} rotation-x={Math.PI / 2} />
    <group ref={propulsion} position={[0, -.94, 0]}>
      <mesh geometry={r.sphere} material={r.cyan} scale={[.19, .12, .19]} />
      <mesh geometry={r.sphere} material={r.violet} position={[0, -.17, 0]} scale={[.095, .12, .095]} />
    </group>
  </group>;
}
