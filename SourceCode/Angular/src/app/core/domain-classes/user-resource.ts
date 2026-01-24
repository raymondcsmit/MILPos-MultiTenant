import { ResourceParameter } from './resource-parameter';

export class UserResource extends ResourceParameter {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
}
