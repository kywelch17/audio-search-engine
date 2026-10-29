import type { ReactNode } from 'react';
export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <h2 className="mt-6 mb-2 flex justify-between text-sm font-semibold tracking-wider text-zinc-500 uppercase">
      {children}
      {action}
    </h2>
  );
}
