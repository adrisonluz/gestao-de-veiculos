'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Car,
  LayoutDashboard,
  PanelLeft,
  PieChart,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/reports', icon: PieChart, label: 'Relatórios' },
];

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const renderNavItem = (item: typeof navItems[0]) => (
    <Tooltip key={item.href}>
      <TooltipTrigger asChild>
        <Link href={item.href}>
          <Button
            variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-lg"
            aria-label={item.label}
          >
            <item.icon className="size-5" />
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={5}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-card sm:flex">
          <nav className="flex flex-col items-center gap-4 px-2 py-4">
            <Link href="/dashboard" className="mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Car className="h-5 w-5" />
              </div>
              <span className="sr-only">Safetrack</span>
            </Link>
            {navItems.map(renderNavItem)}
          </nav>
        </aside>
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Abrir Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs">
                <nav className="grid gap-6 text-lg font-medium">
                  <Logo />
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 px-2.5 ${
                        pathname.startsWith(item.href)
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="sm:hidden">
                <Logo />
            </div>
            <div className="ml-auto">
              <UserNav />
            </div>
          </header>
          <main className="flex-1 p-4 sm:px-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
