import { ContactAddress } from './contact-address';
import { EntityState } from './entity-state';

export interface Customer {
  id: string;
  customerName: string;
  contactPerson: string;
  email: string;
  mobileNo: string;
  phoneNo: string;
  objectState?: EntityState;
  isDeleted?: boolean;
  isVerify?: boolean;
  isSendMail?: boolean;
  description: string;
  website: string;
  url?: string;
  imageUrl?: string;
  logo?: string;
  isImageUpload?: boolean;
  isWalkIn?: boolean;
  taxNumber?: string;
  billingAddress?: ContactAddress;
  shippingAddress?: ContactAddress;
  billingAddressId?: string;
  shippingAddressId?: string;
}
