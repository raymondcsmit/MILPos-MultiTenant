import { LanguageFlag } from '@core/header/languages';
import { BusinessLocation } from './business-location';
import { FinancialYear } from '../../accounting/financial-year/financial-year';

export class CompanyProfile {
  id?: string;
  title!: string;
  taxName!: string;
  taxNumber!: string;
  address!: string;
  logoUrl?: string;
  imageData?: string;
  phone?: string;
  email?: string;
  currencyCode?: string;
  businessType?: number;
  languages?: LanguageFlag[];
  locations?: BusinessLocation[];
  financialYears?: FinancialYear[];
}
