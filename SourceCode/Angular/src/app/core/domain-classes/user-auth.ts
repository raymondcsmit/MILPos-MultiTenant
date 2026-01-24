import { User } from './user';

export class UserAuth {
  isAuthenticated: boolean = false;
  profilePhoto?: string;
  claims: string[] = [];
  logoUrl?: string;
  authorisation!: Authorisation;
  user!: User;
  status!: string;
  tokenTime!: Date;
  bearerToken: string = '';
  id?: string;
  userName: string = '';
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  phoneNumber: string = '';
}

export class Authorisation {
  token!: string;
  type!: string;
}

export class AuthToken {
  [key: string]: string;

}
