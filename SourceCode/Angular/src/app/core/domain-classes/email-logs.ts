import { EmailLogAttachments } from "./email-log-attachments";

export interface EmailLogs {
  id?: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  statusName: string;
  sentAt: Date;
  errorMessage?: string;
  emailLogAttachments?: EmailLogAttachments[];
}
