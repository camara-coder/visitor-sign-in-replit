// api.js - Functions for interacting with backend APIs

// Base URL for API requests
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eventsignin.com';

// Generic fetch wrapper with error handling
async function fetchWithAuth(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for authentication
    });

    // Check if the response is OK (status in the range 200-299)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    // Check if the response has content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Auth API functions
export async function loginUser(credentials) {
  return fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function registerUser(userData) {
  return fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function logoutUser() {
  return fetchWithAuth('/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  return fetchWithAuth('/auth/me');
}

// Event API functions
export async function fetchAllEvents() {
  return fetchWithAuth('/events');
}

export async function fetchEventById(eventId) {
  return fetchWithAuth(`/events/${eventId}`);
}

export async function enableEvent() {
  return fetchWithAuth('/events/enable', {
    method: 'POST',
  });
}

export async function disableEvent(eventId) {
  return fetchWithAuth(`/events/${eventId}/disable`, {
    method: 'POST',
  });
}

// Visitor API functions
export async function fetchVisitors(eventId) {
  return fetchWithAuth(`/events/${eventId}/visitors`);
}

export async function registerVisitor(visitorData) {
  return fetchWithAuth('/visitors/register', {
    method: 'POST',
    body: JSON.stringify(visitorData),
  });
}

// Mock implementations for local development
// These will be replaced by actual API calls in production
if (process.env.NODE_ENV === 'development') {
  // Import the development mocks only in development mode
  const { 
    mockLoginUser, 
    mockRegisterUser, 
    mockLogoutUser,
    mockGetCurrentUser,
    mockFetchAllEvents,
    mockFetchEventById,
    mockEnableEvent,
    mockDisableEvent,
    mockFetchVisitors,
    mockRegisterVisitor
  } = require('./mock-api');

  // Override the actual functions with mocks in development
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') {
    console.warn('Using mock API endpoints for development');
    
    // Auth mocks
    loginUser = mockLoginUser;
    registerUser = mockRegisterUser;
    logoutUser = mockLogoutUser;
    getCurrentUser = mockGetCurrentUser;
    
    // Event mocks
    fetchAllEvents = mockFetchAllEvents;
    fetchEventById = mockFetchEventById;
    enableEvent = mockEnableEvent;
    disableEvent = mockDisableEvent;
    
    // Visitor mocks
    fetchVisitors = mockFetchVisitors;
    registerVisitor = mockRegisterVisitor;
  }
}
