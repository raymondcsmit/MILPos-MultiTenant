import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { BaseComponent } from '../../base.component';
import { PayRollStore } from '../pay-roll-store';
import { PayRollResourceParameter } from './pay-roll-resource-parameter';
import {
  debounceTime,
  distinctUntilChanged,
  merge,
  Observable,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';
import { CommonService } from '@core/services/common.service';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { PayRoll } from '../pay-roll';
import { PayRollService } from '../pay-roll.service';
import { Month, Months } from '@core/domain-classes/months';
import { PaymentModeNamePipe } from '../payment-mode.pipe';
import { EmployeeResourceParameter } from '../employee-resource-parameter';
import { Employee } from '../employee';
import { PaymentMode } from '../../accounting/account-enum';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-pay-roll-list',
  imports: [
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatSortModule,
    MatPaginatorModule,
    FormsModule,
    MatIconModule,
    TranslateModule,
    RouterLink,
    PageHelpTextComponent,
    HasClaimDirective,
    UTCToLocalTime,
    MatDividerModule,
    MatCardModule,
    MatMenuModule,
    PaymentModeNamePipe,
    MatNativeDateModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    NgClass
  ],
  templateUrl: './pay-roll-list.html',
  styleUrl: './pay-roll-list.scss',
})
export class PayRollList extends BaseComponent implements OnInit {
  displayedColumns: string[] = [
    'action',
    'salaryDate',
    'employeeName',
    'branchName',
    'salaryMonth',
    'paymentMode',
    'basicSalary',
    'totalSalary',
  ];
  filteredColoumns: string[] = [
    'action-search',
    'salaryDate-search',
    'employeeName-search',
    'branchName-search',
    'salaryMonth-search',
    'paymentMode-search',
    'basicSalary-search',
    'totalSalary-search',
  ];
  footerToDisplayed = ['footer'];
  months: Month[] = Months;
  Months = Months;
  getMonthName(monthId: number): string {
    const month = this.Months.find((m) => m.id === monthId);
    return month ? month.name : '';
  }
  employeeResource: EmployeeResourceParameter = new EmployeeResourceParameter();
  employeeNameControl: FormControl = new FormControl();
  payRollStore = inject(PayRollStore);
  payRollResource: PayRollResourceParameter = {
    ...this.payRollStore.payRollResourceParameter(),
  };
  employees: Employee[] = [];
  loading$!: Observable<boolean>;
  loading = this.payRollStore.isLoading();
  locations: BusinessLocation[] = [];

  paymentMode = Object.keys(PaymentMode)
    .filter((key) => !isNaN(Number(PaymentMode[key as any])))
    .map((key) => ({
      label: key,
      value: PaymentMode[key as keyof typeof PaymentMode],
    }));

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  _locationFilter: string = this.payRollResource.branchId ?? '';
  _employeeFilter: string = this.payRollResource.employeeId ?? '';
  _fromDateFilter: Date | null = this.payRollResource.fromDate ?? null;
  _toDateFilter: Date | null = this.payRollResource.toDate ?? null;

  public filterObservable$: Subject<string> = new Subject<string>();

  public get FromDateFilter(): Date | null {
    return this._fromDateFilter;
  }

  public set FromDateFilter(v: Date | null) {
    if (this._fromDateFilter !== v) {
      this._fromDateFilter = v;
      const fromDateFilter = `fromDate:${v}`;
      this.filterObservable$.next(fromDateFilter);
    }
  }

  public get ToDateFilter(): Date | null {
    return this._toDateFilter;
  }

  public set ToDateFilter(v: Date | null) {
    if (this._toDateFilter !== v) {
      this._toDateFilter = v;
      const toDateFilter = `toDate:${v}`;
      this.filterObservable$.next(toDateFilter);
    }
  }

  public get EmployeeFilter(): string {
    return this._employeeFilter;
  }

  public set EmployeeFilter(v: string) {
    if (this._employeeFilter !== v) {
      this._employeeFilter = v;
      const employeeFilter = `employee:${v}`;
      this.filterObservable$.next(employeeFilter);
    }
  }

  public get LocationFilter(): string {
    return this._locationFilter;
  }

  public set LocationFilter(v: string) {
    this._locationFilter = v ? v : '';
    const locationFilter = `location:${this._locationFilter}`;
    this.filterObservable$.next(locationFilter);
  }

  private _salaryMonthFilter!: string;
  public get SalaryMonthFilter(): string {
    return this._salaryMonthFilter;
  }
  public set SalaryMonthFilter(v: string) {
    if (this._salaryMonthFilter !== v) {
      this._salaryMonthFilter = v;
      const salaryMonthFilerValue = `salaryMonth:${v}`;
      this.filterObservable$.next(salaryMonthFilerValue);
    }
  }

  private _paymentModeFilter!: string;
  public get PaymentModeFilter(): string {
    return this._paymentModeFilter;
  }
  public set PaymentModeFilter(v: string) {
    if (this._paymentModeFilter !== v) {
      this._paymentModeFilter = v;
      const paymentModeFilerValue = `paymentMode:${v}`;
      this.filterObservable$.next(paymentModeFilerValue);
    }
  }

  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    private commonService: CommonService,
    private payRollService: PayRollService
  ) {
    super();
    this.getLangDir();
    this.getBusinessLocations();
    this.getEmployees();
  }

  ngOnInit(): void {
    this.employeeNameChangeValue();
    const orderBy = this.payRollStore.payRollResourceParameter()?.orderBy?.split(' ');
    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    }
    this._employeeFilter = this.payRollResource.employeeId ?? '';
    this._locationFilter = this.payRollResource.branchId ?? '';
    this._salaryMonthFilter = this.payRollResource.salaryMonth ?? '';
    this._paymentModeFilter = this.payRollResource.paymentMode ?? '';
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.payRollResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'fromDate') {
          if (strArray[1] != 'null') {
            this.payRollResource.fromDate = new Date(strArray[1]);
            this.payRollResource.toDate = this.ToDateFilter;
          } else {
            this.payRollResource.fromDate = null;
            this.payRollResource.toDate = null;
          }
        } else if (strArray[0] === 'toDate') {
          if (strArray[1] != 'null') {
            this.payRollResource.toDate = new Date(strArray[1]);
            this.payRollResource.fromDate = this.FromDateFilter;
          } else {
            this.payRollResource.fromDate = null;
            this.payRollResource.toDate = null;
          }
        } else if (strArray[0] === 'location') {
          this.payRollResource.branchId = strArray[1];
        } else if (strArray[0] === 'employee') {
          this.payRollResource.employeeId = strArray[1];
        } else if (strArray[0] === 'salaryMonth') {
          this.payRollResource.salaryMonth = strArray[1];
        } else if (strArray[0] === 'paymentMode') {
          this.payRollResource.paymentMode = strArray[1];
        }
        this.payRollStore.loadByQuery(this.payRollResource);
      });
  }

  refresh() {
    this.payRollStore.loadByQuery(this.payRollResource);
  }

  clearDates() {
    this.FromDateFilter = null;
    this.ToDateFilter = null;
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.payRollResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.payRollResource.pageSize = this.paginator.pageSize;
          this.payRollResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.payRollStore.loadByQuery(this.payRollResource);
        })
      )
      .subscribe();
  }

  employeeNameChangeValue() {
    this.sub$.sink = this.employeeNameControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.employeeResource.name = c;
          return this.payRollService.getEmployeesForDropDown(this.employeeResource.name);
        })
      )
      .subscribe((resp: Employee[]) => {
        this.employees = resp;
      });
  }

  getEmployees() {
    this.payRollService.getEmployeesForDropDown(this.employeeResource.name).subscribe((resp) => {
      this.employees = resp;
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
    });
  }

  downloadAttachment(payRoll: PayRoll) {
    this.sub$.sink = this.payRollService
      .downloadAttachment(payRoll.attachment)
      .subscribe((event) => {
        if (event.type === HttpEventType.Response) {
          this.downloadFile(event, payRoll.attachment);
        }
      });
  }

  private downloadFile(data: HttpResponse<Blob>, name: string) {
    const downloadedFile = new Blob([data.body ?? ''], { type: data.body?.type });
    const a = document.createElement('a');
    a.setAttribute('style', 'display:none;');
    document.body.appendChild(a);
    a.download = name;
    a.href = URL.createObjectURL(downloadedFile);
    a.target = '_blank';
    a.click();
    document.body.removeChild(a);
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.payRollStore.payRolls().indexOf(row);
  }
}
