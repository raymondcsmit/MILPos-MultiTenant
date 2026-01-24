import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { merge, Subject } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';
import { Customer } from '@core/domain-classes/customer';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CustomerStore } from '../customer-store';
import { CommonModule } from '@angular/common';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { TableSettingsStore } from '../../table-setting/table-setting-store';
import { CustomerSoListComponent } from './customer-so-list/customer-so-list.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from "@angular/material/card";
import { ToastrService } from '@core/services/toastr.service';
import { MatDialog } from '@angular/material/dialog';
import { ImportExportService } from '@core/services/import-export.service';
import { ImportExportDialogComponent } from '@shared/import-export-dialog/import-export-dialog.component';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    PageHelpTextComponent,
    TranslateModule,
    MatIconModule,
    HasClaimDirective,
    MatTableModule,
    FormsModule,
    MatSortModule,
    MatPaginatorModule,
    CustomerSoListComponent,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
    MatCardModule
  ]
})
export class CustomerListComponent extends BaseComponent implements OnInit {
  customers: Customer[] = [];
  displayedColumns: string[] = ['action', 'customerName', 'contactPerson', 'email', 'mobileNo', 'website'];
  columnsToDisplay: string[] = ["footer"];
  customerStore = inject(CustomerStore);
  tableSettingsStore = inject(TableSettingsStore);
  customerResource: CustomerResourceParameter = { ...this.customerStore.customerResourceParameter() };
  loading = this.customerStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _nameFilter: string = this.customerResource.customerName;
  _emailFilter: string = this.customerResource.email;
  _mobileOrPhoneFilter: string = this.customerResource.mobileNo;
  _websiteFilter: string = this.customerResource.website;
  _contactPersonFilter: string = this.customerResource.contactPerson;
  public filterObservable$: Subject<string> = new Subject<string>();
  expandedElement!: Customer | null;

  get visibleTableKeys(): string[] {
    return this.tableSettingsStore.customersTableSettingsVisible().map(c => c.key);
  }

  get visibleTableKeysSearch(): string[] {
    return this.tableSettingsStore.customersTableSettingsVisible().map(c => c.key + '-search');
  }
  public get NameFilter(): string {
    return this._nameFilter;
  }

  public set NameFilter(v: string) {
    if (this._nameFilter !== v) {
      this._nameFilter = v;
      const nameFilter = `customerName##${v}`;
      this.filterObservable$.next(nameFilter);
    }
  }


  public get ContactFilter(): string {
    return this._contactPersonFilter;
  }

  public set ContactFilter(v: string) {
    if (this._contactPersonFilter !== v) {
      this._contactPersonFilter = v;
      const customerNameFilter = `contactPerson##${v}`;
      this.filterObservable$.next(customerNameFilter);
    }
  }

  public get WebsiteFilter(): string {
    return this._websiteFilter;
  }

  public set WebsiteFilter(v: string) {
    if (this._websiteFilter != v) {
      this._websiteFilter = v;
      const websiteFilter = `website##${v}`;
      this.filterObservable$.next(websiteFilter);
    }
  }

  public get EmailFilter(): string {
    return this._emailFilter;
  }
  public set EmailFilter(v: string) {
    if (this._emailFilter !== v) {
      this._emailFilter = v;
      const emailFilter = `email##${v}`;
      this.filterObservable$.next(emailFilter);
    }
  }

  public get MobileOrPhoneFilter(): string {
    return this._mobileOrPhoneFilter;
  }

  public set MobileOrPhoneFilter(v: string) {
    if (this._mobileOrPhoneFilter !== v) {
      this._mobileOrPhoneFilter = v;
      const mobileOrFilter = `mobileNo##${v}`;
      this.filterObservable$.next(mobileOrFilter);
    }
  }

  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private commonDialogService: CommonDialogService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private importExportService: ImportExportService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    const orderBy = this.customerStore.customerResourceParameter()?.orderBy?.split(" ");

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }

    this.ContactFilter = this.customerResource.contactPerson;
    this.EmailFilter = this.customerResource.email;
    this.MobileOrPhoneFilter = this.customerResource.mobileNo;
    this.NameFilter = this.customerResource.customerName;
    this.WebsiteFilter = this.customerResource.website;
    this.sub$.sink = this.filterObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged())
      .subscribe((c) => {
        this.customerResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('##');
        if (strArray[0] === 'customerName') {
          this.customerResource.customerName = strArray[1].trim();
        } else if (strArray[0] === 'email') {
          this.customerResource.email = strArray[1];
        } else if (strArray[0] === 'mobileNo') {
          this.customerResource.mobileNo = strArray[1];
        }
        else if (strArray[0] === 'contactPerson') {
          this.customerResource.contactPerson = strArray[1];
        }
        else if (strArray[0] === 'website') {
          this.customerResource.website = encodeURI(strArray[1].trim());
        }
        this.customerStore.loadByQuery(this.customerResource);
      });
  }
  refresh() {
    this.customerStore.loadByQuery(this.customerResource);
  }

  onTableRefresh() {
    this.router.navigate([`/table-settings/Customers`]);
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.customerResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.customerResource.pageSize = this.paginator.pageSize;
          this.customerResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.customerStore.loadByQuery(this.customerResource);
        })
      )
      .subscribe();
  }

  deleteCustomer(customer: Customer) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')} ${customer.customerName}`)
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.customerStore.deleteCustomerById(customer.id);
        }
      });
  }

  editCustomer(customerId: string) {
    this.router.navigate(['/customer', customerId])
  }

  toggleRow(customer: Customer) {
    this.expandedElement = this.expandedElement === customer ? null : customer;
    this.cd.detectChanges();
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.customerStore.customers().indexOf(row);
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportExportDialogComponent, {
      width: '700px',
      data: {
        entityType: 'customers',
        entityName: 'Customer'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refresh();
      }
    });
  }

  exportData(format: 'csv' | 'excel'): void {
    this.importExportService.exportData('customers', format)
      .subscribe({
        next: (blob) => {
          const date = new Date().toISOString().split('T')[0];
          const fileName = `Customers_${date}.${format === 'excel' ? 'xlsx' : 'csv'}`;
          this.importExportService.downloadFile(blob, fileName);
          this.toastrService.success('Data exported successfully');
        },
        error: (error) => {
          this.toastrService.error('Export failed: ' + error.message);
        }
      });
  }
}
