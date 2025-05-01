import { User, Event, Visitor, RegisterVisitorRequest } from "../types";

// Base API URL 
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';

// Helper function to handle fetch responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    // Try to get error message from response
    let errorMessage;
    try {
      const data = await response.json();
      errorMessage = data.message || data.error || response.statusText;
    } catch (e) {
      errorMessage = response.statusText;
    }
    
    throw new Error(errorMessage);
  }
  
  // Return empty response for 204 No Content
  if (response.status === 204) {
    return null;
  }
  
  // Parse JSON for other responses
  return response.json();
};

// Authentication

export const login = async (credentials: { username: string; password: string }): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });
  
  return handleResponse(response);
};

export const register = async (userData: { username: string; password: string; organizationName: string }): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
    credentials: 'include',
  });
  
  return handleResponse(response);
};

export const logout = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  
  return handleResponse(response);
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      credentials: 'include',
    });
    
    if (response.status === 401) {
      return null;
    }
    
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};

// Event Management

export const fetchCurrentEvent = async (): Promise<Event | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/events/current`, {
      credentials: 'include',
    });
    
    if (response.status === 404) {
      return null;
    }
    
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching current event:", error);
    return null;
  }
};

export const fetchEventDetails = async (eventId: string): Promise<Event | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`);
    
    if (response.status === 404) {
      return null;
    }
    
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching event details:", error);
    return null;
  }
};

export const enableEvent = async (): Promise<Event> => {
  const response = await fetch(`${API_BASE_URL}/api/events/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  
  return handleResponse(response);
};

export const disableEvent = async (eventId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  
  return handleResponse(response);
};

// Visitor Management

export const fetchVisitors = async (eventId: string): Promise<Visitor[]> => {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/visitors`, {
    credentials: 'include',
  });
  
  return handleResponse(response);
};

export const registerVisitor = async (data: RegisterVisitorRequest): Promise<{ status: string; message?: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/visitors/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return handleResponse(response);
};
