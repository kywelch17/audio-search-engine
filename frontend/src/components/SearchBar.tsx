export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="search"
      placeholder="Search what was said…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-base outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-50"
    />
  );
}
