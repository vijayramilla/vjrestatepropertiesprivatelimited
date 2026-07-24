export interface LeadRequirement {
  selfPurchase: string;
  propertyType: string;
  preferredLocation: string;
  budget: string;
  paymentMode: string;
  timeline: string;
  specialRequirements: string;
}

export interface LeadNote {
  text: string;
  addedBy: string;
  createdAt: string;
}

export interface Lead {
  _id: string;
  leadId: string;
  name: string;
  phone: string;
  email: string;
  leadSource: string;
  status: LeadStatus;
  priority: LeadPriority;
  assignedAgent: { _id: string; name: string; email: string } | null;
  requirement: LeadRequirement;
  notes: LeadNote[];
  followUps: FollowUp[];
  siteVisits: SiteVisit[];
  activityHistory: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Property Shared'
  | 'Site Visit Scheduled'
  | 'Negotiation'
  | 'Booked'
  | 'Closed'
  | 'Lost';

export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export const LEAD_STATUSES: LeadStatus[] = [
  'New Lead',
  'Contacted',
  'Property Shared',
  'Site Visit Scheduled',
  'Negotiation',
  'Booked',
  'Closed',
  'Lost',
];

export const LEAD_PRIORITIES: LeadPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export interface FollowUp {
  _id: string;
  lead: string;
  scheduledAt: string;
  note: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
}

export interface SiteVisit {
  _id: string;
  lead: string;
  visitedAt: string;
  location: string;
  note: string;
  outcome: string;
  createdBy: string;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  lead: string;
  action: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

export interface Agent {
  _id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
