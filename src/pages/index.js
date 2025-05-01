import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/auth');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Event Sign-In System</title>
        <meta name="description" content="A visitor sign-in system for event hosts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to the Event Sign-In System
        </h1>

        <p className={styles.description}>
          {isLoading ? 'Loading...' : 'Redirecting...'}
        </p>
      </main>

      <Footer />
    </div>
  );
}
