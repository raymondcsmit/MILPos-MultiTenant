import { Component, OnInit } from '@angular/core';
import { Tenant } from '@core/domain-classes/tenant';
import { TenantService } from '@core/services/tenant.service';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatDialog } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { TenantAddUpdateComponent } from '../tenant-add-update/tenant-add-update';
import { TenantAdminManageComponent } from '../tenant-admin-manage/tenant-admin-manage.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgClass, CommonModule } from '@angular/common';

@Component({
  selector: 'app-tenant-list',
  templateUrl: './tenant-list.html',
  styleUrls: ['./tenant-list.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatTooltipModule,
    NgClass
  ]
})
export class TenantListComponent extends BaseComponent implements OnInit {
  tenants: Tenant[] = [];
  displayedColumns: string[] = ['action', 'name', 'subdomain', 'licenseType', 'status', 'createdDate'];

  constructor(
    private tenantService: TenantService,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService
  ) {
    super();
  }

  ngOnInit(): void {
    this.loadTenants();
  }

  loadTenants(): void {
    this.sub$.sink = this.tenantService.getAll().subscribe((list) => {
      this.tenants = list;
    });
  }

  manageTenant(tenant: Tenant | null): void {
    const dialogRef = this.dialog.open(TenantAddUpdateComponent, {
      width: '1000px',
      maxHeight: '90vh',
      direction: this.langDir,
      data: Object.assign({}, tenant) // simple copy
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result: Tenant) => {
      if (result) {
        this.loadTenants();
      }
    });
  }

  manageAdmin(tenant: Tenant): void {
    this.dialog.open(TenantAdminManageComponent, {
      width: '600px',
      direction: this.langDir,
      data: Object.assign({}, tenant)
    });
  }

  toggleStatus(tenant: Tenant): void {
    const newStatus = !tenant.isActive;
    const msg = newStatus ? 'ACTIVATE' : 'DEACTIVATE';
    this.sub$.sink = this.tenantService.toggleStatus(tenant.id, newStatus).subscribe((updated) => {
      this.toastrService.success(`Tenant ${newStatus ? 'Activated' : 'Deactivated'} Successfully`);
      tenant.isActive = updated.isActive;
    });
  }

  switchTenant(tenant: Tenant): void {
    if(!tenant.isActive) {
      this.toastrService.error('Cannot switch to inactive tenant');
      return;
    }
    
    this.sub$.sink = this.tenantService.switchTenant(tenant.id).subscribe((res: any) => {
      if(res && res.token) {
        // Clear storage and set new token
        localStorage.clear();
        localStorage.setItem('auth_token', res.token);
        // We might need to handle user details but usually decoding token or fetching profile again is needed.
        // For simplicity, reload app to re-initialize everything from new token.
        window.location.href = '/'; 
      }
    });
  }

  generateLicense(tenant: Tenant): void {
    this.sub$.sink = this.tenantService.generateLicenseKeys(tenant.id).subscribe((res: any) => {
      this.toastrService.success('License Keys Generated Successfully');
      // show keys in dialog or just success
      this.commonDialogService.deleteConformationDialog(
        `License Generated.\nKey: ${res.licenseKey}\nCode: ${res.purchaseCode}`
      );
    });
  }

  exportTenant(tenant: Tenant): void {
    this.sub$.sink = this.tenantService.exportToSqlite(tenant.id).subscribe(
      (data: Blob) => {
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tenant_${tenant.name}_export.zip`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastrService.success('Tenant Data Exported Successfully');
      },
      (err) => {
        this.toastrService.error('Failed to export tenant data');
      }
    );
  }
}
