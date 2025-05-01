'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/admin');
      } else {
        router.push('/auth');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-4">Visitor Sign-In System</h1>
          <p className="text-xl mb-8">Welcome to the event check-in system.</p>
          <div className="animate-pulse">
            <p className="text-gray-500">Redirecting...</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
