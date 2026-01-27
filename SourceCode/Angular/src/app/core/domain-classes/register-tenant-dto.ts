export interface RegisterTenantDto {
    name: string;
    subdomain: string;
    adminEmail: string;
    phone: string;
    address: string;
    adminPassword?: string;
}
