import { ResourceParameter } from './resource-parameter';

export class EmailLogResource extends ResourceParameter {
    senderEmail?: string = '';
    recipientEmail?: string = '';
    subject?: string = ''
}