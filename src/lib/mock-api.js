/**
 * Mock API implementations for local development only
 * These mocks simulate the behavior of the actual API endpoints
 * They are used only in development mode and when NEXT_PUBLIC_USE_MOCK_API is set to 'true'
 */

// Mock local storage management
const STORAGE_KEYS = {
  USER: 'mock_current_user',
  EVENTS: 'mock_events',
  VISITORS: 'mock_visitors',
};

// Initialize mock storage if it doesn't exist
const initMockStorage = () => {
  if (typeof window === 'undefined') return;
  
  // Initialize user
  if (!localStorage.getItem(STORAGE_KEYS.USER)) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(null));
  }

  // Initialize events
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    const mockEvents = [];
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(mockEvents));
  }

  // Initialize visitors
  if (!localStorage.getItem(STORAGE_KEYS.VISITORS)) {
    const mockVisitors = {};
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(mockVisitors));
  }
};

// Helper to get data from mock storage
const getFromStorage = (key, defaultValue = null) => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Helper to save data to mock storage
const saveToStorage = (key, data) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

// Generate a UUID for IDs
const generateUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Wait for a simulated network delay
const simulateNetworkDelay = (minMs = 200, maxMs = 600) => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Initialize mock data
initMockStorage();

// Mock auth functions
export async function mockLoginUser(credentials) {
  await simulateNetworkDelay();
  
  const { username, password } = credentials;
  
  // Mock validation
  if (!username || !password) {
    throw new Error('Username and password are required');
  }
  
  // Mock user lookup
  const mockUser = {
    id: '1',
    username,
    hostName: 'Demo Organization',
    email: 'demo@example.com',
    socialMedia: {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
    },
  };
  
  saveToStorage(STORAGE_KEYS.USER, mockUser);
  return mockUser;
}

export async function mockRegisterUser(userData) {
  await simulateNetworkDelay();
  
  const { username, password, hostName, email } = userData;
  
  // Mock validation
  if (!username || !password || !hostName || !email) {
    throw new Error('All fields are required');
  }
  
  // Mock user creation
  const newUser = {
    id: generateUuid(),
    username,
    hostName,
    email,
    createdAt: new Date().toISOString(),
    socialMedia: {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
    },
  };
  
  saveToStorage(STORAGE_KEYS.USER, newUser);
  return newUser;
}

export async function mockLogoutUser() {
  await simulateNetworkDelay();
  saveToStorage(STORAGE_KEYS.USER, null);
  return { success: true };
}

export async function mockGetCurrentUser() {
  await simulateNetworkDelay();
  const user = getFromStorage(STORAGE_KEYS.USER);
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  return user;
}

// Mock event functions
export async function mockFetchAllEvents() {
  await simulateNetworkDelay();
  
  // Get current user
  const user = getFromStorage(STORAGE_KEYS.USER);
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get events from storage
  let events = getFromStorage(STORAGE_KEYS.EVENTS, []);
  
  // Check if we need to create a sample event for empty states
  if (events.length === 0) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(endDate.getHours() + 4);
    
    const sampleEvent = {
      id: generateUuid(),
      hostId: user.id,
      hostName: user.hostName,
      status: 'enabled',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      visitorCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      hostLogo: null,
      socialMedia: {
        facebook: 'https://facebook.com',
        instagram: 'https://instagram.com',
        youtube: 'https://youtube.com',
      },
    };
    
    events.push(sampleEvent);
    saveToStorage(STORAGE_KEYS.EVENTS, events);
  }
  
  // Filter events for current user
  return events.filter(event => event.hostId === user.id);
}

export async function mockFetchEventById(eventId) {
  await simulateNetworkDelay();
  
  const events = getFromStorage(STORAGE_KEYS.EVENTS, []);
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  return event;
}

export async function mockEnableEvent() {
  await simulateNetworkDelay();
  
  // Get current user
  const user = getFromStorage(STORAGE_KEYS.USER);
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Create a new event
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(endDate.getHours() + 4);
  
  const newEvent = {
    id: generateUuid(),
    hostId: user.id,
    hostName: user.hostName,
    status: 'enabled',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    visitorCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    hostLogo: null,
    socialMedia: user.socialMedia || {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
    },
  };
  
  // Add to events
  const events = getFromStorage(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  saveToStorage(STORAGE_KEYS.EVENTS, events);
  
  return newEvent;
}

export async function mockDisableEvent(eventId) {
  await simulateNetworkDelay();
  
  // Get events
  const events = getFromStorage(STORAGE_KEYS.EVENTS, []);
  const eventIndex = events.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    throw new Error('Event not found');
  }
  
  // Update event status
  events[eventIndex] = {
    ...events[eventIndex],
    status: 'disabled',
    updatedAt: new Date().toISOString(),
  };
  
  saveToStorage(STORAGE_KEYS.EVENTS, events);
  return events[eventIndex];
}

// Mock visitor functions
export async function mockFetchVisitors(eventId) {
  await simulateNetworkDelay();
  
  // Get visitors for this event
  const allVisitors = getFromStorage(STORAGE_KEYS.VISITORS, {});
  const eventVisitors = allVisitors[eventId] || [];
  
  return eventVisitors;
}

export async function mockRegisterVisitor(visitorData) {
  await simulateNetworkDelay();
  
  const { eventId, firstName, lastName, address, phoneNumber } = visitorData;
  
  // Validate required fields
  if (!eventId || !firstName || !lastName) {
    return { status: 'missing_information' };
  }
  
  // Check if event exists and is enabled
  const events = getFromStorage(STORAGE_KEYS.EVENTS, []);
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    return { status: 'no_event_available' };
  }
  
  if (event.status !== 'enabled') {
    return { status: 'no_event_available' };
  }
  
  // Check for duplicate registration
  const allVisitors = getFromStorage(STORAGE_KEYS.VISITORS, {});
  const eventVisitors = allVisitors[eventId] || [];
  
  const isDuplicate = eventVisitors.some(visitor => 
    visitor.firstName.toLowerCase() === firstName.toLowerCase() && 
    visitor.lastName.toLowerCase() === lastName.toLowerCase()
  );
  
  if (isDuplicate) {
    return { status: 'duplicate_registration' };
  }
  
  // Create visitor record
  const newVisitor = {
    id: generateUuid(),
    eventId,
    firstName,
    lastName,
    address: address || null,
    phoneNumber: phoneNumber || null,
    registrationTime: new Date().toISOString(),
  };
  
  // Save visitor
  allVisitors[eventId] = [...(allVisitors[eventId] || []), newVisitor];
  saveToStorage(STORAGE_KEYS.VISITORS, allVisitors);
  
  // Update event visitor count
  const eventIndex = events.findIndex(e => e.id === eventId);
  events[eventIndex] = {
    ...events[eventIndex],
    visitorCount: (events[eventIndex].visitorCount || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.EVENTS, events);
  
  return { status: 'success', visitor: newVisitor };
}
