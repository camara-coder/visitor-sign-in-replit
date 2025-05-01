'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VisitorForm from '@/components/visitor-form';
import Header from '@/components/header';
import Footer from '@/components/footer';

interface Event {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  hostId: number;
  hostName: string;
  branding: {
    logoUrl: string;
    primaryColor: string;
    organizationName: string;
  };
}

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Event not found');
          } else if (response.status === 403) {
            throw new Error('Event is not currently active');
          } else {
            throw new Error('Failed to load event');
          }
        }
        
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const handleSubmitSuccess = (visitorId: string) => {
    router.push(`/event/${eventId}/confirmation?visitorId=${visitorId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="mb-4">{error || 'Event not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        hostName={event.hostName} 
        logoUrl={event.branding.logoUrl}
        primaryColor={event.branding.primaryColor}
        organizationName={event.branding.organizationName}
      />
      <main className="flex-grow flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">Sign In</h1>
          <VisitorForm eventId={eventId} onSubmitSuccess={handleSubmitSuccess} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
