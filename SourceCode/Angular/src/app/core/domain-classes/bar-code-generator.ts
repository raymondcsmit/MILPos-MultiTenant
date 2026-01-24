export interface BarcodeModel {
  isPrintProudctName: boolean;
  isPrintPackagingDate: boolean;
  isPrintPrice: boolean;
  noOfLabelsPerPage: string;
  products: BarcodeModelItem[];
}

export interface BarcodeModelItem {
  productId: string;
  productName: string;
  productUrl: string;
  noOfLabels: number;
  noOfLabelsAarry: number[];
  packagingDate: Date;
  salesPrice: number;
  barCode: string;
}
