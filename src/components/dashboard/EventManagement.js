import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styles from '@/styles/Home.module.css';
import Button from '@/components/ui/Button';
import { 
  fetchAllEvents, 
  enableEvent, 
  disableEvent
} from '@/lib/api';

export default function EventManagement({ onSelectEvent, selectedEvent }) {
  const queryClient = useQueryClient();
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  
  // Fetch all events
  const { data: events, isLoading, error } = useQuery(
    'events', 
    fetchAllEvents, 
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Enable event mutation
  const enableEventMutation = useMutation(enableEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries('events');
      setIsCreatingEvent(false);
    },
  });

  // Disable event mutation
  const disableEventMutation = useMutation(disableEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries('events');
      if (selectedEvent) {
        onSelectEvent(null);
      }
    },
  });

  // Handle create new event
  const handleCreateEvent = () => {
    setIsCreatingEvent(true);
    enableEventMutation.mutate();
  };

  // Handle disable event
  const handleDisableEvent = (eventId) => {
    disableEventMutation.mutate(eventId);
  };

  // Handle select event
  const handleSelectEvent = (event) => {
    onSelectEvent(event);
  };

  // Set the first event as selected if there's no selected event
  useEffect(() => {
    if (events && events.length > 0 && !selectedEvent) {
      onSelectEvent(events[0]);
    }
  }, [events, selectedEvent, onSelectEvent]);

  return (
    <div className={styles.eventManagementContainer}>
      <div className={styles.eventsHeader}>
        <h2>Event Management</h2>
        <Button 
          onClick={handleCreateEvent}
          disabled={isCreatingEvent || enableEventMutation.isLoading}
        >
          {isCreatingEvent || enableEventMutation.isLoading ? 'Creating...' : 'Create New Event'}
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.loadingEvents}>Loading events...</div>
      ) : error ? (
        <div className={styles.errorEvents}>Error loading events: {error.message}</div>
      ) : (
        <>
          <div className={styles.eventListContainer}>
            <h3>Your Events</h3>
            {events && events.length > 0 ? (
              <div className={styles.eventList}>
                {events.map(event => (
                  <div 
                    key={event.id} 
                    className={`${styles.eventCard} ${selectedEvent && selectedEvent.id === event.id ? styles.selected : ''} ${event.status === 'enabled' ? styles.enabledEvent : styles.disabledEvent}`}
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className={styles.eventInfo}>
                      <div className={styles.eventHeader}>
                        <span className={styles.eventId}>Event #{event.id.substring(0, 8)}</span>
                        <span className={`${styles.eventStatus} ${event.status === 'enabled' ? styles.enabled : styles.disabled}`}>
                          {event.status === 'enabled' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className={styles.eventDates}>
                        <div>
                          <strong>Created:</strong> {new Date(event.startDate).toLocaleString()}
                        </div>
                        <div>
                          <strong>Ends:</strong> {new Date(event.endDate).toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.visitorCount}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-users">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        {event.visitorCount || 0} visitors
                      </div>
                    </div>
                    {event.status === 'enabled' && (
                      <Button 
                        className={styles.disableButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisableEvent(event.id);
                        }}
                        disabled={disableEventMutation.isLoading}
                      >
                        {disableEventMutation.isLoading && disableEventMutation.variables === event.id 
                          ? 'Disabling...' 
                          : 'Disable Event'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noEvents}>
                <p>You don't have any events yet. Create your first event to get started!</p>
              </div>
            )}
          </div>

          {selectedEvent && (
            <div className={styles.selectedEventDetails}>
              <h3>Selected Event Details</h3>
              <div className={styles.eventDetailCard}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Event ID:</span>
                  <span className={styles.detailValue}>{selectedEvent.id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status:</span>
                  <span className={`${styles.detailValue} ${selectedEvent.status === 'enabled' ? styles.enabled : styles.disabled}`}>
                    {selectedEvent.status === 'enabled' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Start Date:</span>
                  <span className={styles.detailValue}>{new Date(selectedEvent.startDate).toLocaleString()}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>End Date:</span>
                  <span className={styles.detailValue}>{new Date(selectedEvent.endDate).toLocaleString()}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Visitor Count:</span>
                  <span className={styles.detailValue}>{selectedEvent.visitorCount || 0}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
