import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { City } from '@core/domain-classes/city';
import { Country } from '@core/domain-classes/country';
import { Inquiry } from '@core/domain-classes/inquiry';
import { InquiryProduct } from '@core/domain-classes/inquiry-product';
import { InquirySource } from '@core/domain-classes/inquiry-source';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';
import { Product } from '@core/domain-classes/product';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { User } from '@core/domain-classes/user';
import { CommonService } from '@core/services/common.service';
import { InquirySourceService } from '@core/services/inquiry-source.service';
import { InquiryStatusService } from '@core/services/inquiry-status.service';
import { ValidateUrl } from '@shared/validators/url-validation';
import { ToastrService } from '@core/services/toastr.service';
import { of, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs/operators';
import { InquiryService } from '../inquiry.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { BaseComponent } from '../../base.component';
import { ProductService } from '../../product/product.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { MatDialog } from '@angular/material/dialog';
import { ManageInquiryStatusComponent } from '../../inquiry-status/manage-inquiry-status/manage-inquiry-status.component';
import { ManageInquirySourceComponent } from '../../inquiry-source/manage-inquiry-source/manage-inquiry-source.component';

export function emailOrMobileValidator(): any {
  return (form: UntypedFormGroup): ValidationErrors | null => {
    const email: string = form.get('email')?.value;
    const mobileNo: string = form.get('mobileNo')?.value;
    if (email || mobileNo) {
      return null;
    }
    return { mobileoremail: true };
  };
}

@Component({
  selector: 'app-add-inquiry',
  templateUrl: './add-inquiry.component.html',
  styleUrls: ['./add-inquiry.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatDividerModule,
    MatSelectModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    TextEditorComponent
  ]
})
export class AddInquiryComponent extends BaseComponent implements OnInit {
  inquiryForm!: UntypedFormGroup;
  products: Product[] = [];
  inquiry!: Inquiry | null;
  countries: Country[] = [];
  cities: City[] = [];
  public filterObservable$: Subject<string> = new Subject<string>();
  public filterCityObservable$: Subject<string> = new Subject<string>();
  inquiryStatuses: InquiryStatus[] = [];
  users: User[] = [];
  sourcesOfInquiry: InquirySource[] = [];
  productResource: ProductResourceParameter;
  private dialog = inject(MatDialog);

  get inquieryProductArray(): UntypedFormArray {
    return <UntypedFormArray>this.inquiryForm.get('inquiryProducts');
  }

  constructor(
    private fb: UntypedFormBuilder,
    private inquiryService: InquiryService,
    private commonService: CommonService,
    private router: Router,
    private toastrService: ToastrService,
    private productService: ProductService,
    private inquiryStatusService: InquiryStatusService,
    private inquirySourceService: InquirySourceService
  ) {
    super();
    this.getLangDir();
    this.productResource = new ProductResourceParameter();
  }

  ngOnInit(): void {
    this.createInquiryForm();
    this.getCountry();
    this.getCityByName();
    this.getInuiriesStatus();
    this.getInquirySource();
    this.getUsers();
    this.getDefaultProducts();
    this.inquiry = null;

    this.inquiryForm
      .get('productNameInput')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.productResource.name = c ?? '';
          return this.productService.getProductsDropdown(this.productResource);
        })
      )
      .subscribe({
        next: (c) => {
          if (c && c.length > 0) {
            this.products = [...c];
          }
        },
        error: (err) => { },
      }
      );
  }

  getDefaultProducts() {
    this.productResource.name = '';
    this.productService.getProductsDropdown(this.productResource).subscribe((c) => {
      this.products = [...c];
    });
  }

  getUsers() {
    this.sub$.sink = this.commonService
      .getAllUsers()
      .subscribe((resp: User[]) => {
        this.users = resp;
      });
  }

  getCityByName() {
    this.sub$.sink = this.filterCityObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        switchMap((c: string) => {
          if (c) {
            var strArray = c.split(':');
            return this.commonService
              .getCityByName(strArray[0], strArray[1]);
          } else {
            return of(null);
          }
        }))
      .subscribe(
        (c: City[] | null) => {
          if (c && c.length > 0) {
            this.cities = [...c];
          }
        });
  }

  patchInquiry() {
    this.inquiryForm.patchValue({
      companyName: this.inquiry ? this.inquiry.companyName : '',
      contactPerson: this.inquiry ? this.inquiry.contactPerson : '',
      email: this.inquiry ? this.inquiry.email : '',
      mobileNo: this.inquiry ? this.inquiry.mobileNo : '',
      phoneNo: this.inquiry ? this.inquiry.phone : '',
      description: this.inquiry ? this.inquiry.description : '',
      website: this.inquiry ? this.inquiry.website : '',
      address: this.inquiry ? this.inquiry.address : '',
      cityName: this.inquiry ? this.inquiry.cityName : '',
      countryName: this.inquiry ? this.inquiry.countryName : '',
      inquiryProducts: this.inquiry ? this.inquiry.inquiryProducts : '',
      message: this.inquiry ? this.inquiry.message : '',
      inquirySourceId: this.inquiry ? this.inquiry.inquirySourceId : '',
      assignTo: this.inquiry ? this.inquiry.assignTo : '',
      inquiryStatusId: this.inquiry ? this.inquiry.inquiryStatusId : '',
    });
    if (this.inquiry && this.inquiry.countryName && this.inquiry.cityName) {
      const strCountryCity =
        this.inquiry.countryName + ':' + this.inquiry.cityName;
      this.filterCityObservable$.next(strCountryCity);
    }
  }

  createInquiryForm() {
    this.inquiryForm = this.fb.group(
      {
        id: [''],
        productNameInput: [''],
        productId: [''],
        inquiryProducts: this.fb.array([]),
        companyName: ['', [Validators.required, Validators.maxLength(500)]],
        contactPerson: ['', Validators.required],
        email: ['', [Validators.email]],
        mobileNo: [''],
        phoneNo: [''],
        website: ['', [ValidateUrl]],
        address: [''],
        cityName: [''],
        countryName: [''],
        message: [''],
        inquirySourceId: ['', [Validators.required]],
        inquiryStatusId: [null, [Validators.required]],
        assignTo: [null],
      },
      {
        validators: [emailOrMobileValidator()],
      }
    );
  }

  getCountry() {
    this.sub$.sink = this.commonService.getCountry().subscribe((data) => {
      this.countries = data;
    });
  }

  getInuiriesStatus() {
    this.sub$.sink = this.inquiryStatusService.getAll().subscribe((c) => {
      this.inquiryStatuses = c;
    });
  }

  getInquirySource() {
    this.inquirySourceService
      .getAll()
      .subscribe((c) => (this.sourcesOfInquiry = c));
  }

  handleFilterCity(cityName: any) {
    cityName = this.inquiryForm.get('cityName')?.value;
    const country = this.inquiryForm.get('countryName')?.value;
    if (cityName && country) {
      const strCountryCity = country + ':' + cityName;
      this.filterCityObservable$.next(strCountryCity);
    }
  }
  onCountryChange(country: any) {
    this.inquiryForm.patchValue({
      cityName: '',
    });

    if (country.value) {
      const strCountry = country.value + ':' + '';
      this.filterCityObservable$.next(strCountry);
    } else {
      this.cities = [];
    }
  }
  onInquiryList() {
    this.router.navigate(['/inquiry']);
  }

  onInquirySubmit() {
    if (this.inquieryProductArray.length == 0) {
      this.toastrService.error(
        this.translationService.getValue('PLEASE_SELECT_ATLEST_ONE_PRODUCT')
      );
      return;
    }
    if (this.inquiryForm.valid) {
      const inqObj = this.createBuildForm();
      if (this.inquiry) {
        this.sub$.sink = this.inquiryService
          .updateInquiry(this.inquiry?.id ?? '', inqObj)
          .subscribe(
            (c) => {
              this.toastrService.success(
                this.translationService.getValue('INQUIRY_SAVE_SUCCESSFULLY')
              );
              this.router.navigate(['/inquiry']);
            });
      } else {
        this.sub$.sink = this.inquiryService.saveInquiry(inqObj).subscribe(
          (c) => {
            this.toastrService.success(
              this.translationService.getValue('INQUIRY_SAVE_SUCCESSFULLY')
            );
            this.router.navigate(['/inquiry']);
          });
      }
    } else {
      this.inquiryForm.markAllAsTouched();
      // this.markFormGroupTouched(this.inquiryForm);
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

  createBuildForm(): Inquiry {
    const inquiryObj: Inquiry = {
      id: this.inquiry ? this.inquiry.id : '',
      companyName: this.inquiryForm.get('companyName')?.value,
      contactPerson: this.inquiryForm.get('contactPerson')?.value,
      email: this.inquiryForm.get('email')?.value,
      mobileNo: this.inquiryForm.get('mobileNo')?.value,
      phone: this.inquiryForm.get('phoneNo')?.value,
      website: this.inquiryForm.get('website')?.value,
      message: this.inquiryForm.get('message')?.value,
      countryName: this.inquiryForm.get('countryName')?.value,
      cityName: this.inquiryForm.get('cityName')?.value,
      address: this.inquiryForm.get('address')?.value,
      inquiryProducts: this.inquiryForm.get('inquiryProducts')?.value,
      inquirySourceId: this.inquiryForm.get('inquirySourceId')?.value,
      inquiryStatusId: this.inquiryForm.get('inquiryStatusId')?.value,
      assignTo: this.inquiryForm.get('assignTo')?.value,
    };
    return inquiryObj;
  }

  editInquiryProduct(product: InquiryProduct): UntypedFormGroup {
    return this.fb.group({
      productId: [product.productId],
      name: [product.name],
      inquiryId: [product.inquiryId],
    });
  }

  pushValuesInquiryProduct() {
    if (
      this.inquiry && this.inquiry.inquiryProducts &&
      this.inquiry.inquiryProducts.length > 0
    ) {
      this.inquiry.inquiryProducts.map((product) => {
        this.inquieryProductArray.push(this.editInquiryProduct(product));
      });
    }
  }

  selectProduct() {
    const product = this.products.find(
      (c) => c.id === this.inquiryForm.get('productId')?.value
    );

    const isExists = this.inquieryProductArray.controls.find((c) => c.get('productId')?.value === product?.id);

    if (!isExists && product) {
      this.inquieryProductArray.push(
        this.editInquiryProduct({
          productId: product.id ?? '',
          inquiryId: this.inquiry ? this.inquiry.id ?? '' : '',
          name: product.name,
        })
      );
      this.inquiryForm.get('productNameInput')?.setValue(null);
      this.inquiryForm.get('productId')?.setValue('');
    }
  }

  removeProduct(index: number) {
    this.inquieryProductArray.removeAt(index);
    this.inquiryForm.get('productId')?.setValue('');
  }

  openAddInquiryStatusDialog() {
    const dialogRef = this.dialog.open(ManageInquiryStatusComponent, {
      width: '400px',
      data: {},
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inquiryStatuses = [...this.inquiryStatuses, result];
        this.inquiryForm.get('inquiryStatusId')?.setValue(result.id);
      }
    });
  }

  openAddInquirySourceDialog() {
    const dialogRef = this.dialog.open(ManageInquirySourceComponent, {
      width: '400px',
      data: {},
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.sourcesOfInquiry = [...this.sourcesOfInquiry, result];
        this.inquiryForm.get('inquirySourceId')?.setValue(result.id);
      }
    });
  }
}
