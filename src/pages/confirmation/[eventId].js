import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import ConfirmationPage from '@/components/ConfirmationPage';
import { fetchEventById } from '@/lib/api';
import Footer from '@/components/layout/Footer';

export default function Confirmation() {
  const router = useRouter();
  const { eventId, status } = router.query;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      fetchEventById(eventId)
        .then(data => {
          setEvent(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching event:', err);
          setError('Failed to load event information. Please try again later.');
          setLoading(false);
        });
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Loading... | Event Sign-In</title>
          <meta name="description" content="Loading confirmation page" />
        </Head>
        <main className={styles.main}>
          <div className={styles.loader}>Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Error | Event Sign-In</title>
          <meta name="description" content="Error loading confirmation page" />
        </Head>
        <main className={styles.main}>
          <div className={styles.error}>
            <h1>Error</h1>
            <p>{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Thank You | {event?.hostName || 'Event'}</title>
        <meta name="description" content="Thank you for signing in" />
      </Head>

      <header className={styles.header}>
        <div className={styles.eventBranding}>
          {event?.hostLogo && (
            <img 
              src={event.hostLogo} 
              alt={`${event.hostName} logo`} 
              className={styles.hostLogo}
            />
          )}
          <h1>{event?.hostName || 'Event Sign-In'}</h1>
        </div>
      </header>

      <main className={styles.main}>
        <ConfirmationPage 
          event={event} 
          status={status} 
        />
      </main>

      <Footer />
    </div>
  );
}
