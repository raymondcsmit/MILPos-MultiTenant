import { ResourceParameter } from './resource-parameter';

export class StockTransferResourceParameter extends ResourceParameter {
  referenceNo: string = '';
  fromLocationId?: string = '';
  toLocationId?:string='';
  id?: string = '';
}
