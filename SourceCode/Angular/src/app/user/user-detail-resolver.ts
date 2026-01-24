import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '@core/domain-classes/user';
import { UserService } from './user.service';

export const userDetailResolver: ResolveFn<User | null> = (route: ActivatedRouteSnapshot) => {
    const userService = inject(UserService);
    const id = route.paramMap.get('id');

    if (id !== null) {
        return userService.getUser(id ?? '') as Observable<User>;
    }
    return null;
};