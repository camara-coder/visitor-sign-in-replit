'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';

interface Event {
  id: string;
  hostId: number;
  hostName: string;
  branding: {
    logoUrl: string;
    primaryColor: string;
    organizationName: string;
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
}

interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.id as string;
  const visitorId = searchParams.get('visitorId');
  
  const [event, setEvent] = useState<Event | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch event details
        const eventResponse = await fetch(`/api/events/${eventId}`);
        if (!eventResponse.ok) {
          throw new Error('Failed to load event details');
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);
        
        // Fetch visitor details if visitorId is available
        if (visitorId) {
          const visitorResponse = await fetch(`/api/visitors/${visitorId}`);
          if (!visitorResponse.ok) {
            throw new Error('Failed to load visitor details');
          }
          const visitorData = await visitorResponse.json();
          setVisitor(visitorData);
        } else {
          throw new Error('Visitor information not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId, visitorId]);

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

  const socialLinks = [];
  if (event.socialMedia.facebook) {
    socialLinks.push(
      <a 
        key="facebook"
        href={event.socialMedia.facebook} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800"
        aria-label="Facebook"
      >
        <FaFacebook size={32} />
      </a>
    );
  }
  
  if (event.socialMedia.instagram) {
    socialLinks.push(
      <a 
        key="instagram"
        href={event.socialMedia.instagram} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-pink-600 hover:text-pink-800"
        aria-label="Instagram"
      >
        <FaInstagram size={32} />
      </a>
    );
  }
  
  if (event.socialMedia.youtube) {
    socialLinks.push(
      <a 
        key="youtube"
        href={event.socialMedia.youtube} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-red-600 hover:text-red-800"
        aria-label="YouTube"
      >
        <FaYoutube size={32} />
      </a>
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
        <div className="w-full max-w-md text-center">
          {visitor ? (
            <div className="animate-fadeIn">
              <h1 className="text-3xl font-bold mb-4">Welcome, {visitor.firstName}!</h1>
              <p className="text-xl mb-6">You have successfully signed in to the event.</p>
              <div className="flex justify-center space-x-6 mb-8">
                {socialLinks.length > 0 ? (
                  socialLinks
                ) : (
                  <p className="text-gray-500">No social media links available</p>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Thank you for attending. We hope you enjoy the event!
              </p>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-500 mb-4">Registration Error</h1>
              <p className="mb-4">We couldn't find your registration details.</p>
              <Link 
                href={`/event/${eventId}`}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-block"
              >
                Try Again
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
