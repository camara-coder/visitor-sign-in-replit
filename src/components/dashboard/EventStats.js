import { useState } from 'react';
import { useQuery } from 'react-query';
import styles from '@/styles/Home.module.css';
import { fetchAllEvents, fetchVisitors } from '@/lib/api';

export default function EventStats() {
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month', 'all'
  
  // Fetch all events
  const { data: events, isLoading: eventsLoading, error: eventsError } = useQuery(
    'events', 
    fetchAllEvents
  );

  // Calculate total visitors
  const totalVisitors = events ? events.reduce((total, event) => total + (event.visitorCount || 0), 0) : 0;
  
  // Calculate active events
  const activeEvents = events ? events.filter(event => event.status === 'enabled').length : 0;
  
  // Calculate recent visitors based on time range
  const calculateRecentVisitorsData = () => {
    if (!events) return [];
    
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    return events
      .filter(event => new Date(event.startDate) >= startDate)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };
  
  const recentEventsData = calculateRecentVisitorsData();

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsHeader}>
        <h2>Event Statistics</h2>
        <div className={styles.timeRangeSelector}>
          <label>Time Range:</label>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={styles.timeRangeSelect}
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {eventsLoading ? (
        <div className={styles.loadingStats}>Loading statistics...</div>
      ) : eventsError ? (
        <div className={styles.errorStats}>Error loading statistics: {eventsError.message}</div>
      ) : (
        <div className={styles.statsContent}>
          <div className={styles.statCardsContainer}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-users">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{totalVisitors}</span>
                <span className={styles.statLabel}>Total Visitors</span>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-calendar">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{events?.length || 0}</span>
                <span className={styles.statLabel}>Total Events</span>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-activity">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{activeEvents}</span>
                <span className={styles.statLabel}>Active Events</span>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bar-chart">
                  <line x1="12" y1="20" x2="12" y2="10"></line>
                  <line x1="18" y1="20" x2="18" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>
                  {recentEventsData.reduce((sum, event) => sum + (event.visitorCount || 0), 0)}
                </span>
                <span className={styles.statLabel}>
                  Visitors ({timeRange === 'day' ? 'Last 24h' : timeRange === 'week' ? 'Last 7d' : timeRange === 'month' ? 'Last 30d' : 'All Time'})
                </span>
              </div>
            </div>
          </div>
          
          <div className={styles.visitorChartContainer}>
            <h3>Recent Events Performance</h3>
            {recentEventsData.length > 0 ? (
              <div className={styles.barChart}>
                {recentEventsData.map((event, index) => {
                  const barHeight = event.visitorCount 
                    ? Math.max(30, Math.min(100, (event.visitorCount / Math.max(...recentEventsData.map(e => e.visitorCount || 0))) * 100)) 
                    : 10;
                  
                  return (
                    <div key={event.id} className={styles.barContainer}>
                      <div 
                        className={styles.bar} 
                        style={{ height: `${barHeight}%` }}
                        title={`Event #${event.id.substring(0, 8)}: ${event.visitorCount || 0} visitors`}
                      >
                        <span className={styles.barValue}>{event.visitorCount || 0}</span>
                      </div>
                      <div className={styles.barLabel}>
                        {new Date(event.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.noChartData}>
                <p>No events data available for the selected time range.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
