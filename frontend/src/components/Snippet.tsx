/** Renders a backend snippet, turning [bracketed] terms into <mark> highlights. */
export function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]*\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[') && p.endsWith(']') ? (
          <mark key={i}>{p.slice(1, -1)}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
