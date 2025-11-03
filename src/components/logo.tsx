
import Image from 'next/image';
import { cn } from '@/lib/utils';
import logo from '@/assets/images/logo.png';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-lg font-semibold font-headline text-primary", className)}>
      <Image src={logo} alt="Safetrack" width={32} height={32} />
      <span>Safetrack</span>
    </div>
  );
}
