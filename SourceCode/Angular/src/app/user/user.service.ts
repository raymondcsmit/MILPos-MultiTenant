import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { User } from '@core/domain-classes/user';
import { Observable } from 'rxjs';
import { CommonError } from '@core/error-handler/common-error';
import { catchError } from 'rxjs/operators';
import { UserClaim } from '@core/domain-classes/user-claim';
import { UserResource } from '@core/domain-classes/user-resource';

@Injectable({ providedIn: 'root' })
export class UserService {

  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService) { }

  updateUser(user: User): Observable<User | CommonError> {
    const url = `user/${user.id}`;
    return this.httpClient.put<User>(url, user)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  addUser(user: User): Observable<User | CommonError> {
    const url = `user`;
    return this.httpClient.post<User>(url, user)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  deleteUser(id: string): Observable<void | CommonError> {
    const url = `user/${id}`;
    return this.httpClient.delete<void>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getUser(id: string): Observable<User | CommonError> {
    const url = `user/${id}`;
    return this.httpClient.get<User>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  updateUserClaim(userClaims: UserClaim[], userId: string): Observable<User | CommonError> {
    const url = `userclaim/${userId}`;
    return this.httpClient.put<User>(url, { userClaims })
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  resetPassword(user: User): Observable<User | CommonError> {
    const url = `user/resetpassword`;
    return this.httpClient.post<User>(url, user)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  changePassword(user: User): Observable<User | CommonError> {
    const url = `user/changepassword`;
    return this.httpClient.post<User>(url, user)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  updateUserProfile(user: User): Observable<User> {
    const url = `user/profile`;
    return this.httpClient.put<User>(url, user);

  }

  getUserProfile(): Observable<User> {
    const url = `user/profile`;
    return this.httpClient.get<User>(url);

  }

  getUsers(resource: UserResource): Observable<HttpResponse<User[]>> {
    const url = `user/getUsers`;
    const customParams = new HttpParams()
      .set('fields', resource.fields)
      .set('orderBy', resource.orderBy)
      .set('pageSize', resource.pageSize.toString())
      .set('skip', resource.skip.toString())
      .set('searchQuery', resource.searchQuery)
      .set('firstName', resource.firstName ? resource.firstName : '')
      .set('lastName', resource.lastName ? resource.lastName : '')
      .set('email', resource.email ? resource.email : '')
      .set('phoneNumber', resource.phoneNumber ? resource.phoneNumber : '')

    return this.httpClient.get<User[]>(url, {
      params: customParams,
      observe: 'response'
    });
  }

  getRecentlyRegisteredUsers(): Observable<User[] | CommonError> {
    const url = `user/GetRecentlyRegisteredUsers`;
    return this.httpClient.get<User[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  sendResetPasswordLink(user: User) {
    return this.httpClient.post<User>('forgotpassword', user);

  }

  getUserInfoFromResetToken(id: string): Observable<User | CommonError> {
    const url = `resetpassword/${id}`;
    return this.httpClient.get<User>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  recoverPassword(token: string, user: User): Observable<User | CommonError> {
    const url = `recoverpassword/${token}`;
    return this.httpClient.post<User>(url, user)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

}
