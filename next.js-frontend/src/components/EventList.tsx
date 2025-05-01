import { useState } from "react";
import { enableEvent, disableEvent } from "@/lib/api";
import { Event } from "@/types";

interface EventListProps {
  currentEvent: Event | null;
  refreshData: () => Promise<void>;
}

export default function EventList({ currentEvent, refreshData }: EventListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEnableEvent = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await enableEvent();
      setSuccess("Event successfully enabled!");
      await refreshData();
    } catch (err) {
      console.error("Error enabling event:", err);
      setError("Failed to enable event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableEvent = async () => {
    if (!currentEvent) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await disableEvent(currentEvent.id);
      setSuccess("Event successfully disabled!");
      await refreshData();
    } catch (err) {
      console.error("Error disabling event:", err);
      setError("Failed to disable event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Event Management</h2>
      
      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {/* Current Event Card */}
      {currentEvent ? (
        <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentEvent.status === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {currentEvent.status === 'enabled' ? 'Active' : 'Inactive'}
              </span>
              <h3 className="text-xl font-semibold mt-2">{currentEvent.title || 'Current Event'}</h3>
              
              <div className="mt-4 space-y-2 text-gray-600">
                <p><span className="font-medium">Event ID:</span> {currentEvent.id}</p>
                <p><span className="font-medium">Start:</span> {formatDate(currentEvent.startDateTime)}</p>
                <p><span className="font-medium">End:</span> {formatDate(currentEvent.endDateTime)}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            {currentEvent.status === 'enabled' ? (
              <button
                onClick={handleDisableEvent}
                disabled={isLoading}
                className="btn-danger"
              >
                {isLoading ? 'Disabling...' : 'Disable Event'}
              </button>
            ) : (
              <p className="text-gray-700">This event has been disabled.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border rounded-lg p-6 mb-6 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Active Event</h3>
          <p className="text-gray-500 mb-4">Create a new event to start collecting visitor registrations.</p>
        </div>
      )}
      
      {/* Enable Event Button */}
      <div className="mt-4">
        <button
          onClick={handleEnableEvent}
          disabled={isLoading || (currentEvent?.status === 'enabled')}
          className={`btn-primary ${(isLoading || (currentEvent?.status === 'enabled')) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Processing...' : currentEvent?.status === 'enabled' ? 'Event Already Active' : 'Enable New Event'}
        </button>
        
        {currentEvent?.status === 'enabled' && (
          <p className="text-sm text-gray-500 mt-2">You must disable the current event before enabling a new one.</p>
        )}
      </div>
    </div>
  );
}
