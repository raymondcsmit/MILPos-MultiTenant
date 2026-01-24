import { ReminderUsers } from "./reminder-users";

export interface Reminder {
  id?: string;
  subject: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  startTime: string;
  endTime: string;
  frequencyId: string;
  reminderDate: Date;
  isRepeated: boolean;
  isEmailNotification: boolean;
  isActive: boolean;
  reminderUsers: ReminderUsers[];
  dailyReminders: DailyReminders[];
  quarterlyReminders: QuarterlyReminders[];
  halfYearlyReminders: HalfYearlyReminders[];
}

export interface DailyReminders {
  id: string;
  reminderId: string;
  dayOfWeek: number;
  isActive: boolean;
}

export interface QuarterlyReminders {
  id?: string;
  reminderId: string;
  day: number;
  month: number;
  quarter: number;
}

export interface HalfYearlyReminders {
  id?: string;
  reminderId: string;
  day: number;
  month: number;
  quarter: number;
}
