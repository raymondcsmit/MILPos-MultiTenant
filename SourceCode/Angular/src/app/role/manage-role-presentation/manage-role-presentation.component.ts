import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Action } from '@core/domain-classes/action';
import { Page } from '@core/domain-classes/page';
import { Role } from '@core/domain-classes/role';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manage-role-presentation',
  templateUrl: './manage-role-presentation.component.html',
  styleUrls: ['./manage-role-presentation.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    FormsModule,
    MatCheckboxModule,
    RouterModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class ManageRolePresentationComponent extends BaseComponent implements OnInit {
  @Input() pages: Page[] = [];
  @Input() loading: boolean = false;
  @Input() role!: Role;
  @Output() onManageRoleAction: EventEmitter<Role> = new EventEmitter<Role>();
  step: number = 0;
  constructor() {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
  }

  onPageSelect(event: MatCheckboxChange, page: Page) {
    if (event.checked) {
      page.pageActions?.forEach(action => {
        if (!this.checkPermission(action.id ?? '')) {
          this.role.roleClaims?.push({
            roleId: this.role.id,
            claimType: action.code,
            claimValue: '',
            actionId: action.id ?? '',
          });
        }
      });
    } else {
      const actions = page.pageActions?.map(c => c.id);
      this.role.roleClaims = this.role.roleClaims?.filter(
        c => !(actions?.includes(c.actionId ?? '') ?? false)
      );
    }
    this.role.roleClaims = [...(this.role.roleClaims ?? [])]; // trigger Angular change detection
  }

  selecetAll(event: MatCheckboxChange) {
    if (event.checked) {
      this.pages.forEach(page => {
        page.pageActions?.forEach(action => {
          if (!this.checkPermission(action.id ?? '')) {
            this.role.roleClaims?.push({
              roleId: this.role.id,
              claimType: action.code,
              claimValue: '',
              actionId: action.id ?? ''
            });
          }
        });
      });
    } else {
      this.role.roleClaims = [];
    }
    this.role.roleClaims = [...(this.role.roleClaims ?? [])]; // trigger Angular change detection
  }

  checkPermission(actionId: string): boolean {
    const pageAction = this.role.roleClaims?.find(c => c.actionId === actionId);
    if (pageAction) {
      return true;
    } else {
      return false;
    }
  }

  onPermissionChange(event: MatCheckboxChange, page: Page, action: Action) {
    if (event.checked) {
      this.role.roleClaims?.push({
        roleId: this.role.id,
        claimType: action.code,
        claimValue: '',
        actionId: action.id ?? ''
      });
    } else {
      this.role.roleClaims = this.role.roleClaims?.filter(c => c.actionId !== action.id) ?? [];
    }
    this.role.roleClaims = [...(this.role.roleClaims ?? [])]; // trigger Angular change detection
  }

  saveRole(): void {
    this.onManageRoleAction.emit(this.role);
  }
}
