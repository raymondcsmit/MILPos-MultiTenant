export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  createdDate: Date;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionPlan?: string;
  maxUsers: number;
  licenseType: string;
  trialExpiryDate?: Date;
  connectionString?: string;
  logoUrl?: string;
  timeZone?: string;
  currency?: string;
  businessType: string;
}
