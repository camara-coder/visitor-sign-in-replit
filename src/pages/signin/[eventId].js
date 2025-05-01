import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import SignInForm from '@/components/SignInForm';
import { fetchEventById } from '@/lib/api';
import Footer from '@/components/layout/Footer';

export default function SignIn() {
  const router = useRouter();
  const { eventId } = router.query;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      fetchEventById(eventId)
        .then(data => {
          if (data && data.status === 'enabled') {
            setEvent(data);
          } else {
            setError('This event is not available for sign-in at this time');
          }
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
          <meta name="description" content="Loading event sign-in page" />
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
          <meta name="description" content="Error loading event sign-in page" />
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
        <title>Sign In | {event?.hostName || 'Event'}</title>
        <meta name="description" content="Sign in to the event" />
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
        <SignInForm eventId={eventId} event={event} />
      </main>

      <Footer />
    </div>
  );
}
