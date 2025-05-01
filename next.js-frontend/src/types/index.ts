// User Types
export interface User {
  id: string;
  username: string;
  organizationName?: string;
  createdAt: string;
}

// Event Types
export interface Event {
  id: string;
  title?: string;
  organizationName?: string;
  status: 'enabled' | 'disabled';
  startDateTime: string;
  endDateTime: string;
  createdBy: string;
  socialLinks?: {
    facebook: string;
    instagram: string;
    youtube: string;
  };
}

// Visitor Types
export interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  address?: string;
  phoneNumber?: string;
  eventId: string;
  registrationTime: string;
}

// Request Types
export interface RegisterVisitorRequest {
  eventId: string;
  firstName: string;
  lastName: string;
  address?: string;
  phoneNumber?: string;
}
