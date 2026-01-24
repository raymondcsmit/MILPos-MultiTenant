import { Product } from "./product";

export interface InquiryProduct {
  productId: string;
  inquiryId: string;
  name: string;
  product?:Product
}
