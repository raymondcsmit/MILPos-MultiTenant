import { Component, inject, OnInit, Optional } from '@angular/core';
import {
  FormGroup,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { City } from '@core/domain-classes/city';
import { CommonModule, Location } from '@angular/common';
import { Country } from '@core/domain-classes/country';
import { Customer } from '@core/domain-classes/customer';
import { CommonService } from '@core/services/common.service';
import { environment } from '@environments/environment';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MatDialogRef } from '@angular/material/dialog';
import { toObservable } from '@angular/core/rxjs-interop';
import { CustomerStore } from '../customer-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-customer-detail',
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    TextEditorComponent,
    MatIconModule,
    HasClaimDirective,
    MatAutocompleteModule,
    MatSelectModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule
  ],
})
export class CustomerDetailComponent extends BaseComponent implements OnInit {
  customerForm!: FormGroup;
  imgSrc: any = null;
  isImageUpload: boolean = false;
  customer!: Customer;
  countries: Country[] = [];
  cities: City[] = [];
  public filterCityObservable$: Subject<string> = new Subject<string>();
  isDialog = false;
  customerStore = inject(CustomerStore);

  constructor(
    private fb: UntypedFormBuilder,
    private commonService: CommonService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    @Optional() private dialogRef: MatDialogRef<CustomerDetailComponent>,
    private toastrService: ToastrService
  ) {
    super();
    this.redirectListPage();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createCustomerForm();
    this.getCountry();
    this.getCityByName();
    const routeSub$ = this.route.data.subscribe((data: any) => {
      if (data.customer) {
        this.customer = { ...data.customer };
        if (this.customer.imageUrl) {
          this.imgSrc = `${environment.apiUrl}${this.customer.imageUrl}`;
        }
        this.patchCustomer();
      } else {
        if (this.customer) {
          this.imgSrc = '';
          this.customer = Object.assign({}, null);
        }
      }
    });
    this.sub$.add(routeSub$);
    if (this.dialogRef) {
      this.isDialog = true;
    }
  }
  redirectListPage() {
    toObservable(this.customerStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        if (this.dialogRef) {
          this.dialogRef.close(this.customerStore.currentCustomer());
        } else {
          this.router.navigate(['/customer']);
        }
      }
    });
  }

  getCityByName() {
    this.sub$.sink = this.filterCityObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        switchMap((c: string) => {
          var strArray = c.split(':');
          return this.commonService.getCityByName(strArray[0], strArray[1]);
        })
      )
      .subscribe((c: City[]) => {
        this.cities = [...c];
      });
  }

  patchCustomer() {
    this.customerForm.patchValue({
      customerName: this.customer.customerName,
      contactPerson: this.customer.contactPerson,
      mobileNo: this.customer.mobileNo,
      phoneNo: this.customer.phoneNo,
      description: this.customer.description,
      website: this.customer.website,
      url: this.customer.url,
      email: this.customer.email,
      taxNumber: this.customer.taxNumber,
      billingAddress: this.customer.billingAddress,
      shippingAddress: this.customer.shippingAddress,
    });
  }

  createCustomerForm() {
    this.customerForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.maxLength(500)]],
      contactPerson: [''],
      mobileNo: ['', [Validators.required]],
      phoneNo: '',
      website: [''],
      description: [''],
      email: ['', [Validators.required, Validators.email]],
      taxNumber: [''],
      billingAddressId: [''],
      shippingAddressId: [''],
      billingAddress: this.fb.group({
        address: ['', [Validators.required]],
        countryName: ['', [Validators.required]],
        cityName: ['', [Validators.required]],
      }),
      shippingAddress: this.fb.group({
        contactPerson: [''],
        mobileNo: [''],
        address: ['', [Validators.required]],
        countryName: ['', [Validators.required]],
        cityName: ['', [Validators.required]],
      }),
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSameAsBillingAddress(event: any) {
    if (event.checked) {
      if (this.customerForm.get('shippingAddress')) {
        this.customerForm.patchValue({
          shippingAddress: this.customerForm.get('billingAddress')?.value,
        });
        // this.customerForm
        //   .get('shippingAddress')
        //   .patchValue(this.customerForm.get('billingAddress')?.value);
      }

      if (this.customerForm.get('contactPerson')?.value) {
        this.customerForm.patchValue({
          shippingAddress: {
            contactPerson: this.customerForm.get('contactPerson')?.value,
          },
        });
      }

      if (this.customerForm.get('mobileNo')?.value) {
        this.customerForm.patchValue({
          shippingAddress: {
            mobileNo: this.customerForm.get('mobileNo')?.value,
          },
        });
      }
    } else {
      this.customerForm.get('shippingAddress')?.reset();
    }
  }

  onFileSelect($event: any) {
    const fileSelected = $event.target.files[0];
    if (!fileSelected) {
      return;
    }
    const mimeType = fileSelected.type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(fileSelected);
    // tslint:disable-next-line: variable-name
    reader.onload = (_event) => {
      this.imgSrc = reader.result;
      this.isImageUpload = true;
      $event.target.value = '';
    };
  }

  onRemoveImage() {
    this.imgSrc = '';
    this.isImageUpload = true;
  }

  getCountry() {
    const CountrySub$ = this.commonService.getCountry().subscribe((data) => {
      this.countries = data;
    });
    this.sub$.add(CountrySub$);
  }

  handleFilterCity(cityName: any, formGroup: string) {
    cityName = this.customerForm.get(formGroup)?.get('cityName')?.value;
    const country = this.customerForm.get(formGroup)?.get('countryName')?.value;
    if (cityName && country) {
      const strCountryCity = country + ':' + cityName;
      this.filterCityObservable$.next(strCountryCity);
    }
  }

  onCountryChange(country: any, formGroup: string) {
    const control = this.customerForm.get(formGroup);
    if (control) {
      control.patchValue({
        cityName: '',
      });
    }

    if (country.value) {
      const strCountry = country.value + ':' + '';
      this.filterCityObservable$.next(strCountry);
    } else {
      this.cities = [];
    }
  }

  onCustomerList(customer?: Customer) {
    if (this.dialogRef) {
      this.dialogRef.close(customer);
    } else {
      this.location.back();
    }
  }

  onCustomerSubmit() {
    if (this.customerForm.valid) {
      const custObj = this.createBuildForm();
      custObj.logo = this.imgSrc;
      custObj.isImageUpload = this.isImageUpload;
      this.customerStore.addUpdateCustomer(custObj);
    } else {
      this.markFormGroupTouched(this.customerForm);
    }
  }

  private markFormGroupTouched(formGroup: UntypedFormGroup) {
    (<any>Object)?.values(formGroup.controls).forEach((control: any) => {
      control.markAsTouched();

      if (control.controls) {
        this.markFormGroupTouched(control);
      }
    });
  }

  createBuildForm(): Customer {
    const customerObj: Customer = {
      id: this.customer ? this.customer.id : '',
      customerName: this.customerForm.get('customerName')?.value,
      contactPerson: this.customerForm.get('contactPerson')?.value,
      mobileNo: this.customerForm.get('mobileNo')?.value,
      phoneNo: this.customerForm.get('phoneNo')?.value,
      website: this.customerForm.get('website')?.value,
      description: this.customerForm.get('description')?.value,
      url: '',
      email: this.customerForm.get('email')?.value,
      taxNumber: this.customerForm.get('taxNumber')?.value,
      billingAddress: {
        ...this.customerForm.get('billingAddress')?.value,
        id: this.customer?.billingAddress?.id,
      },
      shippingAddress: {
        ...this.customerForm.get('shippingAddress')?.value,
        id: this.customer?.shippingAddress?.id,
      },
      billingAddressId: this.customerForm.get('billingAddressId')?.value,
      shippingAddressId: this.customerForm.get('shippingAddressId')?.value,
    };
    // customerObj.billingAddress.id = ;
    // customerObj.shippingAddress.id = this.customer?.shippingAddress?.id;
    return customerObj;
  }
}
