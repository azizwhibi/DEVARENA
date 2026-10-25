import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <FileQuestion
        size={20}
        strokeWidth={1.5}
        className="text-violet-300"
        aria-hidden="true"
      />
      <h1 className="text-[28px] font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground">
        This page is unavailable or has moved.
      </p>
      <Link href="/" className="ui-button ui-button-primary">
        Go to DevArena
      </Link>
    </section>
  );
}
