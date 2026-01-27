export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    subscriptionPlan: string;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
    isActive: boolean;
}
