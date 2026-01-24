import { TableSettingJson } from "./table-setting-json";

export interface TableSetting {
  id: number;
  screenName: string;
  settings: TableSettingJson[];
}
