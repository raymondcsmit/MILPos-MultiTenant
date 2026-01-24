import { FinancialYear } from "../../accounting/financial-year/financial-year";

export interface BusinessLocation {
  id?: string;
  name: string;
  address?: string;
  mobile?: string;
  email?: string;
}


export interface UserLocations {
  locations: BusinessLocation[];
  selectedLocation: string;
}

export interface UserFinancialYears {
  financialYears: FinancialYear[];
  selectedFinancialYearId: string;
}