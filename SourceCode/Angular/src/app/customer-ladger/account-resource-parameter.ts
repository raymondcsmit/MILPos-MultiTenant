import { ResourceParameter } from "@core/domain-classes/resource-parameter";

export class AccountResourceParameter extends ResourceParameter {
  id?: string = '';
  override name: string = '';
}
