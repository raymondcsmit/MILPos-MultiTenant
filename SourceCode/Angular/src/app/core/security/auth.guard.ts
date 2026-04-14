import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  CanActivateChild,
  CanLoad,
  Route
} from '@angular/router';
import { Observable } from 'rxjs';
import { SecurityService } from './security.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';


@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild, CanLoad {
  constructor(
    private securityService: SecurityService,
    private router: Router,
    private toastr: ToastrService,
    private translationService: TranslationService
  ) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (this.securityService.isLogin()) {
      let claimType: string = next.data["claimType"];
      if (claimType) {
        if (!this.securityService.hasClaim(claimType)) {
          this.toastr.error(this.translationService.getValue(`UI_PERMISSION_ERROR`));
          if (this.router.url !== '/login') {
            this.router.navigate(['/login']);
          }
          return false;
        }
      }
    } else {
      this.router.navigate(['login']);
      return false;
    }
    return true;
  }

  canActivateChild(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (this.securityService.isLogin()) {
      let claimType: string = next.data["claimType"];
      if (claimType) {
        if (!this.securityService.hasClaim(claimType)) {
          this.toastr.error(this.translationService.getValue(`UI_PERMISSION_ERROR`));
          return false;
        }
      }
      return true;
    } else {
      this.router.navigate(['login']);
      return false;
    }
  }
  canLoad(route: Route): boolean {
    if (this.securityService.isLogin()) {
      return true;
    } else {
      this.router.navigate(['login']);
      return false;
    }
  }
}
