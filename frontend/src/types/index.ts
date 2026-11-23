export type Role = 'PROVIDER' | 'CLIENT' | 'ADMIN';

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  companyName?: string | null;
  role: Role;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ServiceItem {
  id: string;
  label: string;
  unit: string;
  unitPriceHT: number;
  vatRate: number;
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteLine {
  id: string;
  label: string;
  quantity: number;
  unitPriceHT: number;
  quoteId: string;
  serviceItemId?: string | null;
}

export interface StatusHistory {
  id: string;
  previousStatus: QuoteStatus | null;
  newStatus: QuoteStatus;
  changedAt: string;
  changedBy?: {
    id: string;
    fullName: string;
    role: Role;
  };
}

export interface Quote {
  id: string;
  reference: string;
  status: QuoteStatus;
  totalHT: number;
  totalTTC: number;
  providerId: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  provider?: User;
  client?: User;
  lines: QuoteLine[];
  statusHistory?: StatusHistory[];
}