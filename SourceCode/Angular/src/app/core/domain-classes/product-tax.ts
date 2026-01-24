import { Tax } from "./tax";

export class ProductTax {
  productId?: string;
  taxId!: string;
  tax?: Tax;
}
