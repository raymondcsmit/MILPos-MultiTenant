import { TableSettingJson } from "@core/domain-classes/table-setting-json";
export const SupplierTableSettings: TableSettingJson[] = [{
  key: 'action',
  header: 'ACTION',
  width: 100,
  type: 'text',
  isVisible: true,
  orderNumber: 2,
  allowSort: false
},
{
  key: 'supplierName',
  header: 'NAME',
  width: 100,
  type: 'text',
  isVisible: true,
  orderNumber: 3,
  allowSort: false
},
{
  key: 'email',
  header: 'EMAIL',
  width: 200,
  type: 'text',
  isVisible: true,
  orderNumber: 3,
  allowSort: true
}, {
  key: 'mobileNo',
  header: 'MOBILE',
  width: 150,
  type: 'text',
  isVisible: true,
  orderNumber: 4,
  allowSort: true
}
  , {
  key: 'country',
  header: 'COUNTRY',
  width: 120,
  type: 'datetime',
  isVisible: true,
  orderNumber: 5,
  allowSort: true
}, {
  key: 'website',
  header: 'WEBSITE',
  width: 120,
  type: 'text',
  isVisible: true,
  orderNumber: 6,
  allowSort: true
}];
