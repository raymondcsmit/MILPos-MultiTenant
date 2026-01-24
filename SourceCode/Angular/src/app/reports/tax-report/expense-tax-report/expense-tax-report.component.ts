import { HttpResponse } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Expense } from '@core/domain-classes/expense';
import { ExpenseCategory } from '@core/domain-classes/expense-category';
import { ExpenseResourceParameter } from '@core/domain-classes/expense-source-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { User } from '@core/domain-classes/user';
import { dateCompare } from '@core/services/date-range';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { ExpenseReportDataSource } from '../../expense-report/expense-report.datasource';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ExpenseTaxReportItemComponent } from './expense-tax-report-item/expense-tax-report-item.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { ExpenseTax } from '@core/domain-classes/expenseTax';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../../base.component';
import { ExpenseService } from '../../../expense/expense.service';
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';



@Component({
  selector: 'app-expense-tax-report',
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    CustomCurrencyPipe,
    ExpenseTaxReportItemComponent,
    FormsModule,
    MatIconModule,
    HasClaimDirective,
    UTCToLocalTime,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    NgClass
  ],
  templateUrl: './expense-tax-report.component.html',
  styleUrl: './expense-tax-report.component.scss',
  providers: [UTCToLocalTime, CustomCurrencyPipe],
})
export class ExpenseTaxReportComponent extends BaseComponent implements OnInit, AfterViewInit {
  dataSource!: ExpenseReportDataSource;
  expenses: Expense[] = [];
  displayedColumns: string[] = ['action',
    'createdDate',
    'expenseDate',
    'reference',
    'totalTax',
    'expenseCategoryId',
    'expenseBy',
  ];
  footerToDisplayed = ['footer'];
  expenseResource: ExpenseResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _referenceFilter!: string;
  _categoryFilter!: string;
  _userFilter!: string;
  users: User[] = [];
  expenseCategories: ExpenseCategory[] = [];
  locations: BusinessLocation[] = [];
  searchForm!: UntypedFormGroup;
  totalAmount: number = 0;
  expandedElement!: Expense | null;
  totalsByTax: ExpenseTax[] = [];
  grandTotalTaxAmount = 0;

  public filterObservable$: Subject<string> = new Subject<string>();

  public get ReferenceFilter(): string {
    return this._referenceFilter;
  }

  public set ReferenceFilter(v: string) {
    this._referenceFilter = v;
    const referenceFilter = `reference:${v}`;
    this.filterObservable$.next(referenceFilter);
  }

  public get CategoryFilter(): string {
    return this._categoryFilter;
  }

  public set CategoryFilter(v: string) {
    this._categoryFilter = v;
    const categoryFilter = `expenseCategoryId:${v}`;
    this.filterObservable$.next(categoryFilter);
  }

  public get UserFilter(): string {
    return this._userFilter;
  }

  public set UserFilter(v: string) {
    this._userFilter = v ? v : '';
    const expenseById = `expenseById:${this._userFilter}`;
    this.filterObservable$.next(expenseById);
  }
  currentDate: Date = this.CurrentDate;

  constructor(
    private expenseService: ExpenseService,
    private cd: ChangeDetectorRef,
    private expenseCategoryService: ExpenseCategoryService,
    private fb: UntypedFormBuilder,
    private utcToLocalTime: UTCToLocalTime,
    private customCurrencyPipe: CustomCurrencyPipe,
    private commonService: CommonService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.expenseResource = new ExpenseResourceParameter();
    this.expenseResource.pageSize = 15;
    this.expenseResource.orderBy = 'createdDate asc';
  }

  ngOnInit(): void {
    this.createSearchFormGroup();
    this.dataSource = new ExpenseReportDataSource(this.expenseService);
    this.getResourceParameter();
    this.getExpenseCategories();
    this.getUsers();
    this.getBusinessLocations();
    this.sub$.sink = this.filterObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged())
      .subscribe((c) => {
        this.expenseResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'reference') {
          this.expenseResource.reference = strArray[1];
        } else if (strArray[0] === 'expenseCategoryId') {
          this.expenseResource.expenseCategoryId = strArray[1];
        } else if (strArray[0] === 'expenseById') {
          this.expenseResource.expenseById = strArray[1];
        }
        this.dataSource.loadData(this.expenseResource);
        this.getExpenseTaxByTaxId();
      });

    this.dataSource.connect().subscribe((data: Expense[]) => {
      this.expenses = data;
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.expenseResource.locationId = locationResponse.selectedLocation;
        this.dataSource.loadData(this.expenseResource);
        this.searchForm
          .get('locationId')
          ?.setValue(this.expenseResource.locationId);
        this.getExpenseTaxByTaxId();
      }
    });
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group({
      fromDate: [this.FromDate],
      toDate: [this.ToDate],
      locationId: ['']
    }, {
      validators: dateCompare()
    });
    this.expenseResource.fromDate = this.FromDate;
    this.expenseResource.toDate = this.ToDate;
  }

  onSearch() {
    if (this.searchForm.valid) {
      this.expenseResource.fromDate = this.searchForm.get('fromDate')?.value;
      this.expenseResource.toDate = this.searchForm.get('toDate')?.value;
      this.expenseResource.locationId = this.searchForm.get('locationId')?.value
      this.dataSource.loadData(this.expenseResource);
      this.getExpenseTaxByTaxId();
    }
  }

  onClear() {
    this.searchForm.reset();
    this.searchForm.get('locationId')?.setValue(this.locations[0]?.id);
    this.expenseResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.expenseResource.toDate = this.searchForm.get('toDate')?.value;
    this.expenseResource.locationId = this.searchForm.get('locationId')?.value
    this.dataSource.loadData(this.expenseResource);
    this.getExpenseTaxByTaxId();
  }


  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.expenseResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.expenseResource.pageSize = this.paginator.pageSize;
          this.expenseResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.expenseResource);
        })
      )
      .subscribe();
  }

  getExpenseCategories() {
    this.expenseCategoryService.getAll().subscribe(categories => {
      this.expenseCategories = categories;
    })
  }

  getUsers() {
    this.sub$.sink = this.commonService.getAllUsers()
      .subscribe((resp: User[]) => {
        this.users = resp;
      });
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.expenseResource.pageSize = c.pageSize;
          this.expenseResource.skip = c.skip;
          this.expenseResource.totalCount = c.totalCount;
          this.totalAmount = c.totalAmount;
        }
      });
  }

  toggleRow(element: Expense) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  onDownloadReport(type: string) {
    if (!this.expenseResource || this.expenseResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }
    
    this.expenseService.getExpensesReport(this.expenseResource)
      .subscribe((c: HttpResponse<Expense[]>) => {
        if (c.body) {
          this.expenses = [...c.body];
          let heading = [[
            this.translationService.getValue('EXPENSE_DATE'),
            this.translationService.getValue('REFERENCE'),
            this.translationService.getValue('AMOUNT'),
            this.translationService.getValue('TAX'),
            this.translationService.getValue('TOTAL_AMOUNT'),
            this.translationService.getValue('EXPENSE_CATEGORY'),
            this.translationService.getValue('EXPENSE_BY')]];

          let expensesReport: any = [];
          this.expenses.forEach((expense: Expense) => {
            expensesReport.push([
              this.utcToLocalTime.transform(expense.expenseDate ?? new Date(), 'shortDate'),
              expense.reference,
              this.customCurrencyPipe.transform(expense.amount),
              this.customCurrencyPipe.transform(expense.totalTax),
              this.customCurrencyPipe.transform(expense.totalTax ?? 0 + expense.amount),
              expense.expenseCategory,
              expense.expenseBy
            ]);
          });

          const title = this.translationService.getValue('EXPENSE_TAX_REPORT');
          if (type == 'csv' || type == 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(workBook, expensesReport, { origin: "A2", skipHeader: true });
            XLSX.utils.book_append_sheet(workBook, workSheet, title);
            XLSX.writeFile(workBook, `${title}.${type}`);
          } else {
            const doc = new jsPDF();
            doc.setFontSize(16);
            const pageWidth = doc.internal.pageSize.getWidth();
            const titleWidth = doc.getTextWidth(title);
            const titleX = (pageWidth - titleWidth) / 2;
            doc.text(title, titleX, 10);
            doc.setFontSize(10);
            const locationName = this.locations.find(x => x.id == this.expenseResource.locationId)?.name;
            let y = 15;
            doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
            let dateFilter = '';
            if (this.expenseResource.fromDate) {
              dateFilter = `${this.translationService.getValue('FROM')}::${this.utcToLocalTime.transform(this.expenseResource.fromDate, 'shortDate')}`;
            }
            if (this.expenseResource.toDate) {
              dateFilter = dateFilter + `   ${this.translationService.getValue('TO')}::${this.utcToLocalTime.transform(this.expenseResource.toDate, 'shortDate')}`;
            }
            if (dateFilter) {
              y = y + 5;
              doc.text(dateFilter, 14, y);
            }
            y = y + 5;
            autoTable(doc, {
              head: heading,
              body: expensesReport,
              startY: y
            });
            if (type === 'pdf') {
              doc.save(`${title}.pdf`);
            }
            else {
              const base64String = doc.output('datauristring').split(',')[1];
              const dialogRef = this.dialog.open(SendEmailComponent, {
                data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title} ${dateFilter}` }),
                minWidth: '40vw',
              });
              dialogRef.afterClosed().subscribe(() => {
              });
            }
          }
        }
      });
  }

  getExpenseTaxByTaxId() {
    this.expenseService
      .getTotalByTaxForExpense(this.expenseResource).subscribe((data: any) => {
        this.totalsByTax = data;
        this.grandTotalTaxAmount = this.totalsByTax.reduce((acc, tax) => acc + Number(tax.taxValue ?? 0), 0);
      });
  }

  onTaxDownloadReport(type: string) {
    let heading = [
      [
        this.translationService.getValue('TAXES'),
        this.translationService.getValue('TOTAL_TAX'),
      ],
    ];

    let taxReport = [];
    this.totalsByTax.forEach((tax) => {
      taxReport.push([
        tax.taxName,
        this.customCurrencyPipe.transform(tax.taxValue),
      ]);
    });

    taxReport.push([
      this.translationService.getValue('TOTAL'),
      this.customCurrencyPipe.transform(this.grandTotalTaxAmount)
    ]);

    const title = this.translationService.getValue('EXPENSE_TAX_REPORT');
    if (type == 'csv' || type == 'xlsx') {
      let workBook = XLSX.utils.book_new();
      XLSX.utils.sheet_add_aoa(workBook, heading);
      let workSheet = XLSX.utils.sheet_add_json(
        workBook,
        taxReport,
        { origin: 'A2', skipHeader: true }
      );
      XLSX.utils.book_append_sheet(workBook, workSheet, title);
      XLSX.writeFile(workBook, `${title}.${type}`);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      const pageWidth = doc.internal.pageSize.getWidth();
      const titleWidth = doc.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      doc.text(title, titleX, 10);
      doc.setFontSize(10);
      const locationName = this.locations.find(x => x.id == this.expenseResource.locationId)?.name;
      let y = 15;
      doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
      let dateFilter = '';
      if (this.expenseResource.fromDate) {
        dateFilter = `${this.translationService.getValue('FROM')}::${this.utcToLocalTime.transform(this.expenseResource.fromDate, 'shortDate')}`;
      }
      if (this.expenseResource.toDate) {
        dateFilter = dateFilter + `   ${this.translationService.getValue('TO')}::${this.utcToLocalTime.transform(this.expenseResource.toDate, 'shortDate')}`;
      }
      if (dateFilter) {
        y = y + 5;
        doc.text(dateFilter, 14, y);
      }
      y = y + 5;
      autoTable(doc, {
        head: heading,
        body: taxReport,
        startY: y
      });
      if (type === 'pdf') {
        doc.save(`${title}.pdf`);
      }
      else {
        const base64String = doc.output('datauristring').split(',')[1];
        const dialogRef = this.dialog.open(SendEmailComponent, {
          data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title} ${dateFilter}` }),
          direction: this.langDir,
          minWidth: '40vw',
        });
        dialogRef.afterClosed().subscribe(() => {
        });
      }
    }
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.expenses.indexOf(row);
  }
}
