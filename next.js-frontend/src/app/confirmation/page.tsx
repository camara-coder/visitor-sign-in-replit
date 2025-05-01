"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConfirmationPage from "@/components/ConfirmationPage";
import { fetchEventDetails } from "@/lib/api";
import { Event } from "@/types";

export default function ConfirmationRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams?.get("eventId");
  const status = searchParams?.get("status");
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEventDetails = async () => {
      if (!eventId) {
        setIsLoading(false);
        return;
      }

      try {
        const eventData = await fetchEventDetails(eventId);
        setEvent(eventData);
      } catch (err) {
        console.error("Error loading event details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEventDetails();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // If no status or eventId is provided, show error
  if (!status || !eventId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold mb-4">Invalid Confirmation</h1>
          <p className="mb-6">Something went wrong. Could not find your registration details.</p>
          <button onClick={() => router.push("/")} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return <ConfirmationPage status={status} event={event} />;
}
