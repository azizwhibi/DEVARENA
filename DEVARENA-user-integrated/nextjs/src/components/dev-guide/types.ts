export type ByteGesture = 'idle' | 'wave' | 'point' | 'think' | 'explain' | 'celebrate';
export type MotionPreference = 'system' | 'reduced' | 'full';
export type Direction = { x: number; y: number };
export type TutorialStep = {
  id: string;
  route: string;
  title: string;
  description: string;
  target: string;
  gesture: ByteGesture;
};
export type TargetRect = { top: number; left: number; width: number; height: number };
