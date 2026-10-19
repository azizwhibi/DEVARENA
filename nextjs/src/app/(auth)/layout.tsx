const glyphs = ['</>', '{ }', '=>', '0x1F', '&&', '[ ]', '++', '#!'];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="arena-grid" aria-hidden="true" />
      <div className="arena-glyphs" aria-hidden="true">
        {glyphs.map((g, i) => <span key={g} style={{ '--i': i } as React.CSSProperties}>{g}</span>)}
      </div>
      {children}
    </>
  );
}
