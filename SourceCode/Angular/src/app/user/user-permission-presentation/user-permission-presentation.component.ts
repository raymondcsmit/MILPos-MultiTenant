import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { Action } from '@core/domain-classes/action';
import { User } from '@core/domain-classes/user';
import { Page } from '@core/domain-classes/page';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-user-permission-presentation',
  templateUrl: './user-permission-presentation.component.html',
  styleUrls: ['./user-permission-presentation.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatCheckboxModule,
    TranslateModule,
    RouterModule,
    HasClaimDirective,
    MatIconModule,
    MatCardModule,
    MatButtonModule
  ]
})
export class UserPermissionPresentationComponent extends BaseComponent implements OnInit {
  @Input() pages!: Page[];
  @Input() user!: User;
  @Output() manageUserClaimAction: EventEmitter<User> = new EventEmitter<User>();
  step: number = 0;
  toastrService = inject(ToastrService);

  constructor() {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
  }

  checkPermission(actionId: string): boolean {
    return this.user.userClaims?.some(c => c.actionId === actionId) ?? false;
  }

  onPermissionChange(event: MatCheckboxChange, page: Page, action: Action) {
    if (event.checked) {
      this.user.userClaims?.push({
        userId: this.user.id,
        claimType: action.code,
        claimValue: '',
        actionId: action.id ?? ''
      });
    } else {
      this.user.userClaims = this.user.userClaims?.filter(c => c.actionId !== action.id) ?? [];
    }
    this.user.userClaims = [...(this.user.userClaims ?? [])];
  }

  onPageSelect(event: MatCheckboxChange, page: Page) {
    if (event.checked) {
      page.pageActions?.forEach(action => {
        if (!this.checkPermission(action.id ?? '')) {
          this.user.userClaims?.push({
            userId: this.user.id,
            claimType: action.code,
            claimValue: '',
            actionId: action.id ?? '',
          });
        }
      });
    } else {
      const actionIds = page.pageActions?.map(a => a.id) ?? [];
      this.user.userClaims = this.user.userClaims?.filter(
        c => !(actionIds.includes(c.actionId ?? ''))
      ) ?? [];
    }
    this.user.userClaims = [...(this.user.userClaims ?? [])];
  }

  selecetAll(event: MatCheckboxChange) {
    if (event.checked) {
      this.pages.forEach(page => {
        page.pageActions?.forEach(action => {
          if (!this.checkPermission(action.id ?? '')) {
            this.user.userClaims?.push({
              userId: this.user.id,
              claimType: action.code,
              claimValue: '',
              actionId: action.id ?? ''
            });
          }
        });
      });
    } else {
      this.user.userClaims = [];
    }
    this.user.userClaims = [...(this.user.userClaims ?? [])];
  }

  saveUserClaim() {
    this.manageUserClaimAction.emit(this.user);
  }
}
