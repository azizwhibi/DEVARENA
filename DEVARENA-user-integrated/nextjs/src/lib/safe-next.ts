export function safeNext(raw: string | null | undefined): string {
  if (!raw?.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || /[\u0000-\u001f\u007f]/.test(raw)) return '/';
  try {
    const origin = 'https://devarena.invalid';
    return new URL(raw, origin).origin === origin ? raw : '/';
  } catch {
    return '/';
  }
}
