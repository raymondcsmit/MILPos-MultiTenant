import { TableSettingJson } from "@core/domain-classes/table-setting-json";

export const ProductTableSettings: TableSettingJson[] = [
  {
    key: 'action',
    header: 'ACTION',
    width: 100,
    type: 'text',
    isVisible: true,
    orderNumber: 1,
    allowSort: false
  },
  {
    key: 'imageUrl',
    header: 'IMAGEURL',
    width: 100,
    type: 'string',
    isVisible: true,
    orderNumber: 2,
    allowSort: false
  },
  {
    key: 'name',
    header: 'NAME',
    width: 200,
    type: 'text',
    isVisible: true,
    orderNumber: 3,
    allowSort: true
  }, {
    key: 'brandName',
    header: 'BRAND',
    width: 150,
    type: 'text',
    isVisible: true,
    orderNumber: 4,
    allowSort: true
  }
  , {
    key: 'categoryName',
    header: 'CATEGORY',
    width: 150,
    type: 'text',
    isVisible: true,
    orderNumber: 5,
    allowSort: true
  }, {
    key: 'unitName',
    header: 'UNIT',
    width: 150,
    type: 'text',
    isVisible: true,
    orderNumber: 6,
    allowSort: true
  }, {
    key: 'purchasePrice',
    header: 'PURCHASE_PRICE',
    width: 150,
    type: 'currency',
    isVisible: true,
    orderNumber: 7,
    allowSort: true
  }, {
    key: 'salesPrice',
    header: 'SALES_PRICE',
    width: 150,
    type: 'currency',
    isVisible: true,
    orderNumber: 8,
    allowSort: true
  }, {
    key: 'mrp',
    header: 'MRP',
    width: 120,
    type: 'currency',
    isVisible: true,
    orderNumber: 9,
    allowSort: false
  }, {
    key: 'alertQuantity',
    header: 'ALERT_QUANTITY',
    width: 120,
    type: 'number',
    isVisible: true,
    orderNumber: 10,
    allowSort: false
  }, {
    key: 'skuCode',
    header: 'SKU_CODE',
    width: 120,
    type: 'text',
    isVisible: true,
    orderNumber: 11,
    allowSort: false
  }, {
    key: 'skuName',
    header: 'SKU_NAME',
    width: 120,
    type: 'text',
    isVisible: true,
    orderNumber: 12,
    allowSort: false
  }, {
    key: 'margin',
    header: 'MARGIN',
    width: 120,
    type: 'number',
    isVisible: true,
    orderNumber: 13,
    allowSort: false
  }
  , {
    key: 'productTaxes',
    header: 'PRODUCT_TAXES',
    width: 150,
    type: 'text',
    isVisible: true,
    orderNumber: 14,
    allowSort: false
  }
];
