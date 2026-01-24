import { Component, inject, OnInit } from '@angular/core';
import { BaseComponent } from '../../base.component';
import { PayRoll } from '../pay-roll';
import {
  FormControl,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PayRollStore } from '../pay-roll-store';
import { PaymentMode } from '../../accounting/account-enum';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { Month, Months } from '@core/domain-classes/months';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import { debounceTime, distinctUntilChanged, min, switchMap } from 'rxjs';
import { EmployeeResourceParameter } from '../employee-resource-parameter';
import { Employee } from '../employee';
import { PayRollService } from '../pay-roll.service';
import { FinancialYearStore } from '../../accounting/financial-year/financial-year-store';

@Component({
  selector: 'app-manage-pay-roll',
  imports: [
    TranslateModule,
    PageHelpTextComponent,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatIconModule,
    RouterLink
],
  templateUrl: './manage-pay-roll.html',
  styleUrl: './manage-pay-roll.scss',
})
export class ManagePayRoll extends BaseComponent implements OnInit {
  payRoll!: PayRoll;
  payRollForm!: UntypedFormGroup;
  isAttachmentDeleted = false;
  months: Month[] = Months;
  employees: Employee[] = [];
  locations: BusinessLocation[] = [];
  private fb = inject(UntypedFormBuilder);
  public payRollStore = inject(PayRollStore);
  public payRollService = inject(PayRollService);
  public commonService = inject(CommonService);
  employeeNameControl: FormControl = new FormControl();
  employeeResource: EmployeeResourceParameter = new EmployeeResourceParameter();
  
  paymentMode = Object.keys(PaymentMode)
    .filter((key) => !isNaN(Number(PaymentMode[key as any])))
    .map((key) => ({
      label: key,
      value: PaymentMode[key as keyof typeof PaymentMode],
    }));

  public get AttachmentName(): string {
    return this.payRollForm.get('attachmentName')?.value;
  }

  ngOnInit(): void {
    this.createPayRollForm();
    this.getBusinessLocations();
    this.getEmployees();
    this.employeeNameChangeValue();

    this.payRollForm.valueChanges.subscribe(() => {
      this.updateTotalSalary();
    });
  }

  createPayRollForm() {
    this.payRollForm = this.fb.group({
      id: [''],
      employeeId: ['', Validators.required],
      branchId: ['', Validators.required],
      salaryMonth: ['', Validators.required],
      mobileBill: ['', [Validators.min(0)]],
      foodBill: ['', [Validators.min(0)]],
      bonus: ['', [Validators.min(0)]],
      commission: ['', [Validators.min(0)]],
      festivalBonus: ['', [Validators.min(0)]],
      travelAllowance: ['', [Validators.min(0)]],
      others: ['', [Validators.min(0)]],
      basicSalary: ['', Validators.required],
      advance: ['', [Validators.min(0)]],
      totalSalary: ['', Validators.required],
      paymentMode: [PaymentMode.CASH],
      chequeNo: [''],
      salaryDate: [this.CurrentDate, Validators.required],
      note: [''],
      attachment: [],
      attachmentName: [''],
      isAttachmentChange: [false],
    });
  }

  updateTotalSalary() {
    const formValue = this.payRollForm.getRawValue();

    const total =
      (Number(formValue.basicSalary) || 0) +
      (Number(formValue.mobileBill) || 0) +
      (Number(formValue.foodBill) || 0) +
      (Number(formValue.bonus) || 0) +
      (Number(formValue.commission) || 0) +
      (Number(formValue.festivalBonus) || 0) +
      (Number(formValue.travelAllowance) || 0) +
      (Number(formValue.others) || 0) +
      (Number(formValue.advance) || 0);

    this.payRollForm.get('totalSalary')?.setValue(total, { emitEvent: false });
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
      if (this.locations?.length > 0) {
        this.payRollForm.patchValue({
          branchId: locationResponse.selectedLocation,
        });
      }
    });
  }

  removeAttachment() {
    this.payRollForm.get('isAttachmentChange')?.setValue(true);
    this.payRollForm.get('attachment')?.setValue('');
    this.payRollForm.get('attachmentName')?.setValue('');
  }

  fileEvent($event: any) {
    this.isAttachmentDeleted = true;
    let files: File[] = $event.target.files;
    if (files.length == 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (_event) => {
      this.payRollForm.get('attachment')?.setValue(file);
      this.payRollForm.get('attachmentName')?.setValue(file.name);
      this.payRollForm.get('isAttachmentChange')?.setValue(true);
    };
  }

  savePayRoll() {
    if (!this.payRollForm.valid) {
      this.payRollForm.markAllAsTouched();
      return;
    }
    const formData = this.buildFormData();
    this.payRollStore.addPayRoll(formData); // now sending FormData instead of plain object
  }

  buildFormData(): FormData {
    const formData = new FormData();

    formData.append('id', this.payRollForm.get('id')?.value || '');
    formData.append('employeeId', this.payRollForm.get('employeeId')?.value);
    formData.append('branchId', this.payRollForm.get('branchId')?.value);
    formData.append('salaryMonth', this.payRollForm.get('salaryMonth')?.value);
    formData.append('mobileBill', this.payRollForm.get('mobileBill')?.value);
    formData.append('foodBill', this.payRollForm.get('foodBill')?.value);
    formData.append('bonus', this.payRollForm.get('bonus')?.value);
    formData.append('commission', this.payRollForm.get('commission')?.value);
    formData.append('festivalBonus', this.payRollForm.get('festivalBonus')?.value);
    formData.append('travelAllowance', this.payRollForm.get('travelAllowance')?.value);
    formData.append('others', this.payRollForm.get('others')?.value);
    formData.append('basicSalary', this.payRollForm.get('basicSalary')?.value);
    formData.append('advance', this.payRollForm.get('advance')?.value);
    formData.append('totalSalary', this.payRollForm.get('totalSalary')?.value);
    formData.append('paymentMode', this.payRollForm.get('paymentMode')?.value);
    formData.append('chequeNo', this.payRollForm.get('chequeNo')?.value);

    // format salaryDate (yyyy-MM-dd)
    const rawSalaryDate = this.payRollForm.get('salaryDate')?.value;
    let formattedSalaryDate = '';
    if (rawSalaryDate) {
      const date = new Date(rawSalaryDate);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      formattedSalaryDate = date.toISOString().split('T')[0];
    }
    formData.append('salaryDate', formattedSalaryDate);

    formData.append('note', this.payRollForm.get('note')?.value);

    const attachment = this.payRollForm.get('attachment')?.value;
    if (attachment) {
      formData.append('file', attachment);
    }

    return formData;
  }
}
