'use client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/main-layout';
import { CompanyOnboardingAlert } from '@/components/company-onboarding-alert';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, memberships } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (memberships.length === 0) {
    return <CompanyOnboardingAlert />;
  }

  return <MainLayout>{children}</MainLayout>;
}
