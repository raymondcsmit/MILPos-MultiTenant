import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { Country } from '@core/domain-classes/country';
import { Supplier } from '@core/domain-classes/supplier';
import { SupplierResourceParameter } from '@core/domain-classes/supplier-resource-parameter';
import { CommonService } from '@core/services/common.service';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, tap } from 'rxjs/operators';
import { SupplierStore } from '../supplier-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { CommonModule, NgClass } from '@angular/common';
import { SupplierPOListComponent } from './supplier-po-list/supplier-po-list.component';
import { BaseComponent } from '../../base.component';
import { TableSettingsStore } from '../../table-setting/table-setting-store';
import { MatCardModule } from "@angular/material/card";
import { ToastrService } from '@core/services/toastr.service';
import { MatDialog } from '@angular/material/dialog';
import { ImportExportService } from '@core/services/import-export.service';
import { ImportExportDialogComponent } from '@shared/import-export-dialog/import-export-dialog.component';

@Component({
  selector: 'app-supplier-list',
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    HasClaimDirective,
    CommonModule,
    SupplierPOListComponent,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    NgClass
  ]
})

export class SupplierListComponent extends BaseComponent implements OnInit {
  displayedColumns: string[] = ['action', 'supplierName', 'email', 'mobileNo', 'country', 'website'];
  columnsToDisplay: string[] = ["footer"];
  countryList: Country[] = [];
  filteredCountryList!: Observable<Country[]>;
  countryControl = new FormControl<string>({ value: '', disabled: false });
  supplierStore = inject(SupplierStore);
  tableSettingsStore = inject(TableSettingsStore);
  supplierResource: SupplierResourceParameter = { ...this.supplierStore.supplierResourceParameter() };
  loading = this.supplierStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _nameFilter: string = this.supplierResource.name;
  _emailFilter: string = this.supplierResource.email;
  _mobileOrPhoneFilter: string = this.supplierResource.mobileNo;
  _websiteFilter: string = this.supplierResource.website ?? '';
  _countryFilter: string = this.supplierResource.country ?? '';

  public filterObservable$: Subject<string> = new Subject<string>();
  expandedElement!: Supplier | null;

  get visibleTableKeys(): string[] {
    return this.tableSettingsStore.suppliersTableSettingsVisible().map(c => c.key);
  }

  get visibleTableKeysSearch(): string[] {
    return this.tableSettingsStore.suppliersTableSettingsVisible().map(c => c.key + '-search');
  }

  public get NameFilter(): string {
    return this._nameFilter;
  }

  public set NameFilter(v: string) {
    if (this._nameFilter != v) {
      this._nameFilter = v;
      const nameFilter = `supplierName##${v}`;
      this.filterObservable$.next(nameFilter);
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

  public get CountryFilter(): string {
    return this._countryFilter;
  }

  public set CountryFilter(v: string) {
    if (this._countryFilter != v) {
      this._countryFilter = v;
      const countryFilter = `country##${v}`;
      this.filterObservable$.next(countryFilter);
    }
  }

  public get EmailFilter(): string {
    return this._emailFilter;
  }
  public set EmailFilter(v: string) {
    if (this._emailFilter != v) {
      this._emailFilter = v;
      const emailFilter = `email##${v}`;
      this.filterObservable$.next(emailFilter);
    }
  }

  public get MobileOrPhoneFilter(): string {
    return this._mobileOrPhoneFilter;
  }

  public set MobileOrPhoneFilter(v: string) {
    if (this._mobileOrPhoneFilter != v) {
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
    private commonService: CommonService,
    private cd: ChangeDetectorRef,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private importExportService: ImportExportService
  ) {
    super();
    this.getLangDir();
  }
  onTableRefresh() {
    this.router.navigate([`/table-settings/Suppliers`]);
  }

  ngOnInit(): void {

    const orderBy = this.supplierStore.supplierResourceParameter()?.orderBy?.split(" ");

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }

    this.getResourceParameter();
    this.getCountries();
    this.sub$.sink = this.filterObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged())
      .subscribe((c) => {
        this.supplierResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('##');
        if (strArray[0] === 'supplierName') {
          this.supplierResource.supplierName = strArray[1].trim();
        } else if (strArray[0] === 'email') {
          this.supplierResource.email = strArray[1].trim();
        } else if (strArray[0] === 'mobileNo') {
          this.supplierResource.mobileNo = strArray[1].trim();
        } else if (strArray[0] === 'website') {
          this.supplierResource.website = encodeURI(strArray[1].trim());
        } else if (strArray[0] === 'country') {
          this.supplierResource.country = strArray[1].trim();
        }
        this.supplierStore.loadByQuery(this.supplierResource);
      });

    this.filteredCountryList = this.countryControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCountryForAutoComplete(value ?? '')),
    );
  }

  refresh() {
    this.supplierStore.loadByQuery(this.supplierResource);
  }

  private _filterCountryForAutoComplete(value: string) {
    const filterValue = value.toLowerCase();
    return this.countryList.filter(country => country.countryName.toLowerCase().includes(filterValue));
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.supplierResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.supplierResource.pageSize = this.paginator.pageSize;
          this.supplierResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.supplierStore.loadByQuery(this.supplierResource);
        })
      )
      .subscribe();
  }

  getCountries() {
    this.sub$.sink = this.commonService.getCountry().subscribe(c => {
      this.countryList = c;
    });
  }

  deleteSupplier(supplier: Supplier) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')} ${supplier.supplierName}`)
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.supplierStore.deleteSupplierById(supplier.id);
        }
      });
  }

  getResourceParameter() {
    this.countryControl.setValue(this.supplierResource.country ?? '');
    this.NameFilter = this.supplierResource.supplierName;
    this.EmailFilter = this.supplierResource.email;
    this.MobileOrPhoneFilter = this.supplierResource.mobileNo;
    this.WebsiteFilter = this.supplierResource.website ?? '';
  }

  editSupplier(supplierId: string) {
    this.router.navigate(['/supplier/manage', supplierId])
  }

  toggleRow(supplier: Supplier) {
    this.expandedElement = this.expandedElement === supplier ? null : supplier;
    this.cd.detectChanges();
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.supplierStore.suppliers().indexOf(row);
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportExportDialogComponent, {
      width: '850px',
      data: {
        entityType: 'suppliers',
        entityName: 'Supplier'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refresh();
      }
    });
  }

  exportData(format: 'csv' | 'excel'): void {
    this.importExportService.exportData('suppliers', format)
      .subscribe({
        next: (blob) => {
          const date = new Date().toISOString().split('T')[0];
          const fileName = `Suppliers_${date}.${format === 'excel' ? 'xlsx' : 'csv'}`;
          this.importExportService.downloadFile(blob, fileName);
          this.toastrService.success('Data exported successfully');
        },
        error: (error) => {
          this.toastrService.error('Export failed: ' + error.message);
        }
      });
  }

}
