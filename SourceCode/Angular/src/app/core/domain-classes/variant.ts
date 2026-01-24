import { VariantItem } from "./variant-item";

export interface Variant {
  id?: string;
  name: string;
  variantItems: VariantItem[];
}
