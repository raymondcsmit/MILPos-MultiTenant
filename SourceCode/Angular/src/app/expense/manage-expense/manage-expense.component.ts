import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Expense } from '@core/domain-classes/expense';
import { ExpenseCategory } from '@core/domain-classes/expense-category';
import { User } from '@core/domain-classes/user';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { ToastrService } from '@core/services/toastr.service';
import { ExpenseService } from '../expense.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import { TaxService } from '@core/services/tax.service';
import { Tax } from '@core/domain-classes/tax';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { ManageExpenseCategoryComponent } from '../../expense-category/manage-expense-category/manage-expense-category.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manage-expense',
  templateUrl: './manage-expense.component.html',
  styleUrls: ['./manage-expense.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatSelectModule,
    RouterModule,
    HasClaimDirective,
    MatDialogModule,
    CustomCurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ]
})
export class ManageExpenseComponent extends BaseComponent implements OnInit {
  expenseForm!: UntypedFormGroup;
  users: User[] = [];
  expenseCategories: ExpenseCategory[] = [];
  isReceiptDeleted = false;
  locations: BusinessLocation[] = [];
  taxes: Tax[] = [];

  public get ReceiptName(): string {
    return this.expenseForm.get('receiptName')?.value;
  }
  constructor(
    private router: Router,
    private fb: UntypedFormBuilder,
    private expenseCategoryService: ExpenseCategoryService,
    private expenseService: ExpenseService,
    private toastrService: ToastrService,
    private activatedRoute: ActivatedRoute,
    private dialog: MatDialog,
    private commonService: CommonService,
    private taxService: TaxService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createExpenseForm();
    this.getExpenseCategories();
    this.getUsers();
    this.getTaxes();
    this.getBusinessLocations();
    this.activatedRoute.data.subscribe((data: any) => {
      if (data.expense) {
        this.expenseForm.controls['locationId'].disable();
        if (data.expense.expenseTaxes.length > 0) {
          const expenseTaxIds = data.expense.expenseTaxes.map((c: any) => c.taxId);
          this.expenseForm.get('expenseTaxIds')?.patchValue(expenseTaxIds);
        }
        this.expenseForm.patchValue(data.expense);
      }
    });
  }

  createExpenseForm() {
    var currentDate = this.CurrentDate;
    this.expenseForm = this.fb.group({
      id: [''],
      reference: [''],
      expenseCategoryId: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1)]],
      expenseById: [''],
      description: [''],
      expenseDate: [currentDate, [Validators.required]],
      receiptName: [''],
      documentData: [],
      locationId: ['', [Validators.required]],
      isReceiptChange: [false],
      expenseTaxIds: [],
    });
  }

  getExpenseCategories() {
    this.expenseCategoryService.getAll().subscribe((categories) => {
      this.expenseCategories = categories;
    });
  }

  getTaxes() {
    this.taxService.getAll().subscribe((c) => (this.taxes = c));
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.expenseForm.patchValue({
          locationId: locationResponse.selectedLocation
        });
      }
    });
  }

  getUsers() {
    this.commonService
      .getAllUsers()
      .subscribe((resp: User[]) => {
        this.users = resp;
      });
  }

  removeReceipt() {
    this.expenseForm.get('isReceiptChange')?.setValue(true);
    this.expenseForm.get('documentData')?.setValue('');
    this.expenseForm.get('receiptName')?.setValue('');
  }

  fileEvent($event: any) {
    this.isReceiptDeleted = true;
    let files: File[] = $event.target.files;
    if (files.length == 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (_event) => {
      this.expenseForm.get('documentData')?.setValue(reader.result?.toString());
      this.expenseForm.get('receiptName')?.setValue(file.name);
      this.expenseForm.get('isReceiptChange')?.setValue(true);
    };
  }

  onExpenseSubmit() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }
    const expense: Expense = this.expenseForm.getRawValue();

    const taxIds: string[] = this.expenseForm.get('expenseTaxIds')?.value;

    if (taxIds) {
      expense.expenseTaxes = taxIds.map((c) => {
        return {
          taxId: c,
          expenseId: expense.id,
          taxValue: ((this.taxes.find((t) => t.id === c)?.percentage ?? 0) * expense.amount) / 100,
        };
      });
      expense.totalTax = expense.expenseTaxes.reduce((a, b) => a + (b.taxValue ?? 0), 0);
    }

    if (expense.id) {
      this.expenseService.updateExpense(expense.id, expense).subscribe(
        (data) => {
          this.toastrService.success(
            this.translationService.getValue('EXPENSE_SAVED_SUCCESSFULLY')
          );
          this.router.navigate(['expense']);
        });
    } else {
      this.expenseService.addExpense(expense).subscribe(
        (data) => {
          this.toastrService.success(
            this.translationService.getValue('EXPENSE_SAVED_SUCCESSFULLY')
          );
          this.router.navigate(['expense']);
        });
    }
  }

  downloadReceipt() {
    const expenseId = this.expenseForm.get('id')?.value;
    if (!expenseId) return;
    this.expenseService.downloadReceipt(expenseId).subscribe((event) => {
      if (event.type === HttpEventType.Response) {
        this.downloadFile(event, this.ReceiptName);
      }
    });
  }

  addExpenseCategory() {
    const dialogRef = this.dialog.open(ManageExpenseCategoryComponent, {
      width: '400px',
      direction: this.langDir,
      data: {},
    });
    dialogRef.afterClosed().subscribe((data: ExpenseCategory) => {
      if (data) {
        this.expenseCategories = [...this.expenseCategories, data];
        this.expenseForm.patchValue({ expenseCategoryId: data.id });
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
}
