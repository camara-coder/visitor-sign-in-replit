"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import EventList from "@/components/EventList";
import VisitorList from "@/components/VisitorList";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { fetchCurrentEvent, fetchVisitors } from "@/lib/api";
import { Event, Visitor } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("events");
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, you'd check if the user is authenticated
        // and redirect to /auth if not
        
        // For now, we'll load the current event if it exists
        const event = await fetchCurrentEvent();
        setCurrentEvent(event);
        
        if (event) {
          const visitorData = await fetchVisitors(event.id);
          setVisitors(visitorData);
        }
      } catch (err) {
        console.error("Error loading admin data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const event = await fetchCurrentEvent();
      setCurrentEvent(event);
      
      if (event) {
        const visitorData = await fetchVisitors(event.id);
        setVisitors(visitorData);
      } else {
        setVisitors([]);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <main className="container py-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Tab navigation */}
        <div className="flex border-b mb-6">
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'events' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('events')}
          >
            Event Management
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'visitors' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('visitors')}
          >
            Visitors ({visitors.length})
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'qrcode' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('qrcode')}
          >
            QR Code
          </button>
        </div>
        
        {/* Tab content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'events' && (
            <EventList 
              currentEvent={currentEvent} 
              refreshData={refreshData}
            />
          )}
          
          {activeTab === 'visitors' && (
            <VisitorList 
              visitors={visitors} 
              eventActive={!!currentEvent && currentEvent.status === 'enabled'}
            />
          )}
          
          {activeTab === 'qrcode' && (
            <QRCodeGenerator 
              currentEvent={currentEvent}
            />
          )}
        </div>
      </main>
    </div>
  );
}
