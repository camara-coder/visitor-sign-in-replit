import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/styles/Home.module.css';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function Auth() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Host Login | Event Sign-In System</title>
        <meta name="description" content="Login to manage your events and visitors" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.authContainer}>
          <div className={styles.formSection}>
            <div className={styles.tabContainer}>
              <LoginForm />
              <RegisterForm />
            </div>
          </div>
          <div className={styles.heroSection}>
            <h1>Event Sign-In System</h1>
            <p>
              Welcome to the Event Sign-In System. Login or register to manage your events, 
              create QR codes for visitor sign-in, and track attendance.
            </p>
            <div className={styles.heroFeatures}>
              <div className={styles.feature}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-users">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Track visitor attendance</span>
              </div>
              <div className={styles.feature}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-calendar">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Manage your events</span>
              </div>
              <div className={styles.feature}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-qr-code">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <path d="M8 8h3v3H8z"></path>
                  <path d="M8 13h3v3H8z"></path>
                  <path d="M13 8h3v3h-3z"></path>
                  <path d="M18 18h-3v-3h3z"></path>
                  <path d="M18 13h-3"></path>
                  <path d="M13 13v3"></path>
                </svg>
                <span>Generate QR codes</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
