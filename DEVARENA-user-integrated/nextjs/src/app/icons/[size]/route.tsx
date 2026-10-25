import { monogram } from '@/lib/icon';

const sizes: Record<string, [number, boolean]> = { '192': [192, false], '512': [512, false], maskable: [512, true] };

export async function GET(_request: Request, { params }: RouteContext<'/icons/[size]'>) {
  const entry = sizes[(await params).size];
  if (!entry) return new Response('Not found', { status: 404 });
  return monogram(...entry);
}
