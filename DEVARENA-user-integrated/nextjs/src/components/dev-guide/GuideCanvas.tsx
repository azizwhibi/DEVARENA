'use client';
import { Component, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { ByteCharacter } from './ByteCharacter';
import { ByteFallback } from './ByteFallback';
import type { ByteGesture, Direction } from './types';

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ByteFallback /> : this.props.children; }
}
export default function GuideCanvas({ gesture, direction, active }: { gesture: ByteGesture; direction: Direction; active: boolean }) {
  const [lost, setLost] = useState(false);
  if (lost) return <ByteFallback />;
  return <CanvasBoundary><Canvas camera={{ position: [0, .2, 7.6], fov: 32 }} dpr={[1, 1.5]} frameloop={active ? 'always' : 'never'} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<ByteFallback />} onCreated={({ gl }) => {
    gl.setClearColor('#000000', 0);
    gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setLost(true); }, { once: true });
  }}>
    <ambientLight intensity={1.3} /><directionalLight position={[3, 5, 5]} intensity={3} color="#dbeafe" />
    <directionalLight position={[-4, 1, -2]} intensity={2} color="#a78bfa" />
    <pointLight position={[-2, -1, 3]} intensity={3} color="#67e8f9" />
    <ByteCharacter gesture={gesture} direction={direction} active={active} />
    <ContactShadows position={[0, -1.6, 0]} opacity={.22} scale={4} blur={2} far={3} resolution={128} frames={1} />
  </Canvas></CanvasBoundary>;
}
