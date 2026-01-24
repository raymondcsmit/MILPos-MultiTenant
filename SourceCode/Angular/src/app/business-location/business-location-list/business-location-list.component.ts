import { Component, OnInit } from '@angular/core';
import { BusinessLocationService } from '../business-location.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { ManageBusinessLocationComponent } from '../manage-business-location/manage-business-location.component';
import { MatDialog } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { SecurityService } from '@core/security/security.service';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { CompanyProfileService } from '../../company-profile/company-profile.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-business-location-list',
  templateUrl: './business-location-list.component.html',
  styleUrls: ['./business-location-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass,
  ],
})
export class BusinessLocationListComponent extends BaseComponent implements OnInit {
  locations: BusinessLocation[] = [];
  displayedColumns = ['action', 'name', 'contactPerson', 'mobile', 'email'];
  constructor(
    private businessLocationService: BusinessLocationService,
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService,
    private companyProfileService: CompanyProfileService,
    private securityService: SecurityService
  ) {
    super();
  }

  ngOnInit(): void {
    this.getBusinessLocation();
  }

  getBusinessLocation() {
    this.businessLocationService.getLocations().subscribe((locations: BusinessLocation[]) => {
      this.locations = locations;
    });
  }

  manageLocation(location: BusinessLocation | null): void {
    const dialogRef = this.dialog.open(ManageBusinessLocationComponent, {
      width: '60vw',
      direction: this.langDir,
      data: Object.assign({}, location),
    });
    dialogRef.afterClosed().subscribe((isModified?: boolean) => {
      if (isModified) {
        this.companyProfileService.getCompanyProfile().subscribe((profile: CompanyProfile) => {
          if (profile) {
            this.securityService.updateProfile(profile);
          }
        });
        this.getBusinessLocation();
      }
    });
  }

  deleteLocation(location: any) {
    const areU = this.translationService.getValue(
      'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
    );

    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${areU} :: ${location.name}`)
      .subscribe((isTrue) => {
        if (isTrue) {
          this.businessLocationService.deleteLocation(location.id).subscribe({
            next: (response: any) => {
              if (response?.success === false) {
                const msg =
                  response?.errors?.[0] ||
                  this.translationService.getValue('SOMETHING_WENT_WRONG');
                this.toastrService.error(msg);
                return;
              }

              this.toastrService.success(
                this.translationService.getValue('BUSINESS_LOCATION_DELETED_SUCCESSFULLY')
              );
              this.getBusinessLocation();
            },
            error: (err) => {
              console.log('Error response:', err);
              const msg =
                err?.error?.errors?.[0] ||
                err?.error?.message ||
                err?.message ||
                this.translationService.getValue('SOMETHING_WENT_WRONG');
              this.toastrService.error(msg);
            },
          });
        }
      });
  }


  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.locations.indexOf(row);
  }
}
