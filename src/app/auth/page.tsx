'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import AuthForm from '@/components/auth-form';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/admin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col md:flex-row bg-gray-50">
        <div className="w-full md:w-1/2 p-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold mb-6">Host Admin Access</h1>
            <AuthForm />
          </div>
        </div>
        <div className="w-full md:w-1/2 bg-blue-600 text-white p-8 flex items-center justify-center">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold mb-4">Welcome to the Visitor Sign-In System</h2>
            <p className="text-xl mb-6">
              Manage your events, view visitor statistics, and generate QR codes for easy visitor sign-in.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li>Create and manage events</li>
              <li>View visitor attendance data</li>
              <li>Generate shareable QR codes</li>
              <li>Customize branding and social media links</li>
            </ul>
            <p className="text-sm">Login or register to access the host dashboard.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
