import { ApplicationEnums } from './application.enum';

export interface ModuleReference {
  referenceId?: string;
  application?: ApplicationEnums;
  selectedDate?: Date;
  reminderId?: string;
}
