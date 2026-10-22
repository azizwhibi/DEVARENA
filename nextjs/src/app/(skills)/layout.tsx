import { Suspense } from 'react';
import './skills.css';
export default function SkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status">
          Loading workspace…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
