import { EntityState } from './entity-state';
import { ContactAddress } from './contact-address';

export interface Supplier {
  id: string;
  supplierName: string;
  contactPerson: string;
  mobileNo: string;
  phoneNo: string;
  objectState?: EntityState;
  isDeleted?: boolean;
  isVerify?: boolean;
  isSendMail?: boolean;
  billingAddress?: ContactAddress | null;
  shippingAddress?: ContactAddress | null;
  description: string;
  website: string;
  url?: string;
  imageUrl?: string;
  logo?: string;
  isImageUpload?: boolean;
  email?: string;
  taxNumber?: string;
  billingAddressId?: string;
  shippingAddressId?: string;
}
