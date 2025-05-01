"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import { fetchEventDetails } from "@/lib/api";
import { Event } from "@/types";

export default function SignInPage({ params }: { params: { eventId: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      if (!params.eventId) {
        setError("Invalid event link");
        setIsLoading(false);
        return;
      }

      try {
        const eventData = await fetchEventDetails(params.eventId);
        
        // Check if event exists and is active
        if (!eventData) {
          setError("Event not found");
        } else if (eventData.status !== 'enabled') {
          setError("This event is not currently active");
        } else {
          // Check if event is within time window
          const now = new Date();
          const start = new Date(eventData.startDateTime);
          const end = new Date(eventData.endDateTime);
          
          if (now < start || now > end) {
            setError("This event is not currently active");
          } else {
            setEvent(eventData);
          }
        }
      } catch (err) {
        console.error("Error loading event:", err);
        setError("Could not load event details");
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [params.eventId]);

  const handleSignInSuccess = () => {
    router.push("/confirmation");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold mb-4">{error}</h1>
          <p className="mb-6">The event you're trying to access is either unavailable, not active, or has already ended.</p>
          <button onClick={() => router.push("/")} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      {event && (
        <div className="container">
          {/* Branding Header */}
          <div className="bg-white rounded-t-lg shadow p-6 mb-1 text-center">
            <h1 className="text-2xl font-bold">{event.title || "Event Sign-In"}</h1>
            {event.organizationName && (
              <p className="text-gray-600">Hosted by {event.organizationName}</p>
            )}
          </div>
          
          {/* Sign-in Form */}
          <div className="bg-white rounded-b-lg shadow p-6">
            <SignInForm eventId={params.eventId} onSuccess={handleSignInSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
