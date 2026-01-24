export interface SendEmailRequest {
  toAddress: string;
  subject: string;
  message: string;
  attachement: string;
  name: string;
  fileType: string;
}
