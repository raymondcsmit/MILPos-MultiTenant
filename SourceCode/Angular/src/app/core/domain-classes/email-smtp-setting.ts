import { StreamInvocationMessage } from "@microsoft/signalr";
export interface EmailSMTPSetting {
  id?: string;
  host: string;
  userName: string;
  password: string;
  port: number;
  isDefault: boolean;
  encryptionType: string;
  fromEmail: string;
  fromName: string;
  toEmail?: string;
}
