import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  children?: ReactNode;
};

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
