import { ResourceParameter } from './resource-parameter';
export class ProductResourceParameter extends ResourceParameter {
  unitId?: string = '';
  barcode?: string = '';
  categoryId?: string = '';
  brandId?: string = '';
  id?: string = '';
  productType?: ProductType;
  parentId?: string;
  locationId?: string = '';
  isBarcodeGenerated?: boolean = false;

}

export enum ProductType {
  MainProduct = '1',
  VariantProduct = '2',
}
