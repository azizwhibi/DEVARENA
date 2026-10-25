'use client';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import type { ByteGesture, Direction } from './types';
import { gestureDuration } from './gestureConfig';

export function useByteAnimation(gesture: ByteGesture, direction: Direction, active: boolean) {
  const body = useRef<Group>(null), head = useRef<Group>(null), gaze = useRef<Group>(null);
  const leftArm = useRef<Group>(null), rightArm = useRef<Group>(null), leftElbow = useRef<Group>(null), rightElbow = useRef<Group>(null);
  const rightHand = useRef<Group>(null), eyes = useRef<Group>(null), propulsion = useRef<Group>(null);
  const motion = useRef({ total: 0, gestureTime: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => { motion.current.gestureTime = 0; }, [gesture]);
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    function follow(event: PointerEvent) {
      if (!fine.matches || event.pointerType === 'touch') return;
      pointer.current = { x: event.clientX / window.innerWidth * 2 - 1, y: 1 - event.clientY / window.innerHeight * 2 };
    }
    window.addEventListener('pointermove', follow, { passive: true });
    return () => window.removeEventListener('pointermove', follow);
  }, []);
  useFrame((state, delta) => {
    if (!active) return;
    // Clamp resumed frames; all smoothing is exponential and independent of FPS.
    const dt = Math.min(delta, 0.05), m = motion.current;
    m.total += dt; m.gestureTime += dt;
    const t = m.total, g = m.gestureTime < gestureDuration[gesture] ? gesture : 'idle';
    const smooth = (from: number, to: number) => MathUtils.damp(from, to, 8, dt);
    // Floating owns only the root position and roll.
    if (body.current) {
      body.current.position.y = Math.sin(t * 1.7) * .065 + (g === 'celebrate' ? Math.sin(m.gestureTime * 6) * .14 : 0);
      body.current.rotation.z = smooth(body.current.rotation.z, Math.sin(t * .8) * .025);
    }
    // Gaze owns the head and pupil offsets; gestures supply a target, never another loop.
    const lookX = g === 'point' ? direction.x * .25 : MathUtils.clamp(pointer.current.x, -1, 1) * .1;
    const lookY = g === 'point' ? direction.y * .15 : MathUtils.clamp(pointer.current.y, -1, 1) * .07;
    if (head.current) {
      head.current.rotation.y = smooth(head.current.rotation.y, lookX);
      head.current.rotation.x = smooth(head.current.rotation.x, -lookY + (g === 'think' ? -.08 : 0));
      head.current.rotation.z = smooth(head.current.rotation.z, g === 'think' ? -.16 : 0);
    }
    if (gaze.current) { gaze.current.position.x = smooth(gaze.current.position.x, lookX * .22); gaze.current.position.y = smooth(gaze.current.position.y, lookY * .2); }
    // Deterministic, short double blink; no timers or React state on frames.
    const blinkPhase = t % 5.3;
    const blink = blinkPhase > 4.85 && blinkPhase < 5.03 ? Math.max(.05, Math.abs(blinkPhase - 4.94) / .09) : 1;
    if (eyes.current) eyes.current.scale.y = smooth(eyes.current.scale.y, blink);
    // Gesture controller is the sole owner of shoulders, elbows and wrist.
    let lz = -.13, rz = .13, lx = 0, rx = 0, le = .1, re = .1, wrist = 0;
    if (g === 'wave') { rz = 2.35; re = .6; wrist = Math.sin(m.gestureTime * 10) * .45; }
    if (g === 'point') {
      const angle = Math.atan2(direction.y, direction.x);
      if (direction.x >= 0) { rz = Math.PI / 2 + angle; re = .05; } else { lz = angle + Math.PI / 2; if (lz > Math.PI) lz -= Math.PI * 2; le = .05; }
    }
    if (g === 'think') { rz = .5; rx = -.9; re = -1.8; wrist = -.2; }
    if (g === 'explain') { lz = -.48 + Math.sin(t * 2.1) * .1; rz = .5 + Math.sin(t * 2.1 + 1) * .14; lx = -.35; rx = -.4; le = -.5; re = -.55; }
    if (g === 'celebrate') { lz = -2.35; rz = 2.35; le = -.25; re = -.25; }
    for (const [ref, z, x] of [[leftArm, lz, lx], [rightArm, rz, rx]] as const) if (ref.current) { ref.current.rotation.z = smooth(ref.current.rotation.z, z); ref.current.rotation.x = smooth(ref.current.rotation.x, x); }
    if (leftElbow.current) leftElbow.current.rotation.x = smooth(leftElbow.current.rotation.x, le);
    if (rightElbow.current) rightElbow.current.rotation.x = smooth(rightElbow.current.rotation.x, re);
    if (rightHand.current) rightHand.current.rotation.z = smooth(rightHand.current.rotation.z, wrist);
    if (propulsion.current) propulsion.current.scale.y = 1 + Math.sin(t * 7) * .08;
  });
  return { body, head, gaze, eyes, leftArm, rightArm, leftElbow, rightElbow, rightHand, propulsion };
}
