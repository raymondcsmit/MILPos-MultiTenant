import { Component, OnInit } from '@angular/core';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { Role } from '@core/domain-classes/role';
import { CommonError } from '@core/error-handler/common-error';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { RoleService } from '../role.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-role-list',
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    HasClaimDirective,
    HasClaimDirective,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    NgClass
  ]
})
export class RoleListComponent extends BaseComponent implements OnInit {

  roles: Role[] = [];
  displayedColumns: string[] = ['action', 'name'];

  constructor(
    private roleService: RoleService,
    private toastrService: ToastrService,
    private commonDialogService: CommonDialogService,
    private commonService: CommonService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getRoles();
  }

  deleteRole(role: Role) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')} ${role.name}`)
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.roleService.deleteRole(role.id ?? '').subscribe(() => {
            this.toastrService.success(this.translationService.getValue('ROLE_DELETED_SUCCESSFULLY'));
            this.getRoles();
          });
        }
      });
  }

  getRoles(): void {
    this.sub$.sink = this.commonService.getRoles()
      .subscribe((data: Role[]) => {
        this.roles = data;
      }, (err: CommonError) => {
        err.messages.forEach(msg => {
          this.toastrService.error(msg)
        });
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.roles.indexOf(row);
  }
}
