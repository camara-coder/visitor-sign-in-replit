import { useState } from 'react';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import EventManagement from '@/components/dashboard/EventManagement';
import VisitorsList from '@/components/dashboard/VisitorsList';
import EventStats from '@/components/dashboard/EventStats';
import QRCodeGenerator from '@/components/dashboard/QRCodeGenerator';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('events');
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <div className={styles.container}>
      <Head>
        <title>Host Dashboard | Event Sign-In System</title>
        <meta name="description" content="Manage your events and track visitors" />
      </Head>

      <Navbar />

      <main className={styles.dashboardMain}>
        <div className={styles.dashboardSidebar}>
          <h2>Dashboard</h2>
          <nav className={styles.dashboardNav}>
            <button 
              className={`${styles.navButton} ${activeTab === 'events' ? styles.active : ''}`}
              onClick={() => setActiveTab('events')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-calendar">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Events
            </button>
            <button 
              className={`${styles.navButton} ${activeTab === 'visitors' ? styles.active : ''}`}
              onClick={() => setActiveTab('visitors')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-users">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Visitors
            </button>
            <button 
              className={`${styles.navButton} ${activeTab === 'stats' ? styles.active : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bar-chart-2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Statistics
            </button>
            <button 
              className={`${styles.navButton} ${activeTab === 'qrcode' ? styles.active : ''}`}
              onClick={() => setActiveTab('qrcode')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-qr-code">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M8 8h3v3H8z"></path>
                <path d="M8 13h3v3H8z"></path>
                <path d="M13 8h3v3h-3z"></path>
                <path d="M18 18h-3v-3h3z"></path>
                <path d="M18 13h-3"></path>
                <path d="M13 13v3"></path>
              </svg>
              QR Code
            </button>
          </nav>
        </div>
        
        <div className={styles.dashboardContent}>
          {activeTab === 'events' && (
            <EventManagement
              onSelectEvent={setSelectedEvent}
              selectedEvent={selectedEvent}
            />
          )}
          {activeTab === 'visitors' && (
            <VisitorsList selectedEvent={selectedEvent} />
          )}
          {activeTab === 'stats' && (
            <EventStats />
          )}
          {activeTab === 'qrcode' && (
            <QRCodeGenerator selectedEvent={selectedEvent} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
