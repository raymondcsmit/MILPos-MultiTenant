import { TableSettingJson } from "@core/domain-classes/table-setting-json";

export const CustomerTableSettings: TableSettingJson[] = [{
  key: 'action',
  header: 'ACTION',
  width: 100,
  type: 'text',
  isVisible: true,
  orderNumber: 2,
  allowSort: false
},
{
  key: 'customerName',
  header: 'NAME',
  width: 100,
  type: 'text',
  isVisible: true,
  orderNumber: 3,
  allowSort: false
},
{
  key: 'contactPerson',
  header: 'CONTACT_PERSON',
  width: 200,
  type: 'text',
  isVisible: true,
  orderNumber: 3,
  allowSort: true
}, {
  key: 'email',
  header: 'EMAIL',
  width: 150,
  type: 'text',
  isVisible: true,
  orderNumber: 4,
  allowSort: true
}
  , {
  key: 'mobileNo',
  header: 'MOBILE',
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
