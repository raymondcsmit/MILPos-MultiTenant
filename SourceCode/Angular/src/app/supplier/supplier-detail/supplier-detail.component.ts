import { Component, inject, OnInit, Optional } from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  Validators,
  ValidatorFn,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonService } from '@core/services/common.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Supplier } from '@core/domain-classes/supplier';
import { Country } from '@core/domain-classes/country';
import { City } from '@core/domain-classes/city';
import { environment } from '@environments/environment';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef } from '@angular/material/dialog';
import { toObservable } from '@angular/core/rxjs-interop';
import { SupplierStore } from '../supplier-store';
import { CommonModule } from '@angular/common';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { MatCardModule } from '@angular/material/card';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from '@core/services/toastr.service';

export class AlreadyExistValidator {
  static exist(flag: boolean): ValidatorFn {
    return (c: AbstractControl): { [key: string]: boolean } | null => {
      if (flag) {
        return { exist: true };
      }
      return null;
    };
  }
}

@Component({
  selector: 'app-supplier-detail',
  templateUrl: './supplier-detail.component.html',
  styleUrls: ['./supplier-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    TextEditorComponent,
    MatCardModule,
    HasClaimDirective,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class SupplierDetailComponent extends BaseComponent implements OnInit {
  supplierForm!: UntypedFormGroup;
  titlePage: string = 'Add Supplier';
  imgSrc: any = null;
  isImageUpload: boolean = false;
  supplier!: Supplier;
  countries: Country[] = [];
  cities: City[] = [];
  isDialog: boolean = false;
  supplierStore = inject(SupplierStore);

  public filterCityObservable$: Subject<string> = new Subject<string>();

  constructor(
    private fb: UntypedFormBuilder,
    private commonService: CommonService,
    private route: ActivatedRoute,
    @Optional() private dialogRef: MatDialogRef<SupplierDetailComponent>,
    private router: Router,
    private toastrService: ToastrService
  ) {
    super();
    this.redirectListPage();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createSupplierForm();
    this.getCountry();
    this.getCityByName();
    const routeSub$ = this.route.data.subscribe(
      (data: any) => {
        if (data.supplier) {
          this.supplier = { ...data.supplier };
          this.titlePage = this.translationService.getValue('MANAGE_SUPPLIER');
          this.patchSupplier();
          if (this.supplier.imageUrl) {
            this.imgSrc = `${environment.apiUrl}${this.supplier.imageUrl}`;
          }
        } else {
          this.titlePage = this.translationService.getValue('MANAGE_SUPPLIER');
          if (this.supplier) {
            this.imgSrc = '';
            this.supplier = Object.assign({}, null);
          }
        }
      }
    );
    this.sub$.add(routeSub$);

    if (this.dialogRef) {
      this.isDialog = true;
    }
  }

  onCancel() {
    this.dialogRef.close();
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
      .subscribe(
        (c: City[]) => {
          this.cities = [...c];
        });
  }

  patchSupplier() {
    this.supplierForm.patchValue({
      supplierName: this.supplier.supplierName,
      contactPerson: this.supplier.contactPerson,
      mobileNo: this.supplier.mobileNo,
      phoneNo: this.supplier.phoneNo,
      email: this.supplier.email,
      description: this.supplier.description,
      website: this.supplier.website,
      url: this.supplier.url,
      billingAddress: this.supplier.billingAddress,
      billingAddressId: this.supplier.billingAddressId,
      shippingAddressId: this.supplier.shippingAddressId,
      shippingAddress: this.supplier.shippingAddress,
      taxNumber: this.supplier.taxNumber,
    });
  }

  createSupplierForm() {
    this.supplierForm = this.fb.group({
      supplierName: ['', [Validators.required, Validators.maxLength(500)]],
      contactPerson: [''],
      mobileNo: [''],
      phoneNo: '',
      website: [''],
      description: [''],
      taxNumber: [''],
      email: ['', [Validators.required, Validators.email]],
      billingAddress: this.fb.group({
        address: ['', [Validators.required]],
        countryName: ['', [Validators.required]],
        cityName: ['', [Validators.required]],
      }),
      shippingAddress: this.fb.group({
        address: ['', [Validators.required]],
        countryName: ['', [Validators.required]],
        cityName: ['', [Validators.required]],
      }),
    });
  }

  onSameAsBillingAddress(event: MatCheckboxChange) {
    if (event.checked) {
      this.supplierForm
        .get('shippingAddress')
        ?.patchValue(this.supplierForm.get('billingAddress')?.value);
    } else {
      this.supplierForm.get('shippingAddress')?.reset();
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
    this.isImageUpload = true;
    this.imgSrc = '';
  }

  getCountry() {
    const CountrySub$ = this.commonService.getCountry().subscribe((data) => {
      this.countries = data;
    });
    this.sub$.add(CountrySub$);
  }

  handleFilterCity(cityName: any, formGroup: string) {
    cityName = this.supplierForm.get(formGroup)?.get('cityName')?.value;
    const country = this.supplierForm.get(formGroup)?.get('countryName')?.value;
    if (cityName && country) {
      const strCountryCity = country + ':' + cityName;
      this.filterCityObservable$.next(strCountryCity);
    }
  }

  onCountryChange(country: any, formGroup: string) {
    this.supplierForm.get(formGroup)?.patchValue({
      cityName: '',
    });
    if (country.value) {
      const strCountry = country.value + ':' + '';
      this.filterCityObservable$.next(strCountry);
    } else {
      this.cities = [];
    }
  }

  redirectListPage() {
    toObservable(this.supplierStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        if (this.dialogRef) {
          this.dialogRef.close(this.supplierStore.currentSupplier());
        } else {
          this.router.navigate(['/supplier']);
        }
      }
    });
  }

  onSupplierSubmit() {
    if (this.supplierForm.valid) {
      let supObj: Supplier = this.createBuildForm();
      supObj.logo = this.imgSrc;
      supObj.isImageUpload = this.isImageUpload;
      if (supObj && (!supObj.billingAddress || !supObj.billingAddress?.address)) {
        supObj = { ...supObj, billingAddress: null };
      }
      if (!supObj.shippingAddress || !supObj.shippingAddress?.address) {
        supObj.shippingAddress = null;
      }
      if (this.supplier) {
        this.supplierStore.updateSupplier(supObj);
      } else {
        this.supplierStore.addSupplier(supObj);
      }
    } else {
      this.markFormGroupTouched(this.supplierForm);
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

  createBuildForm(): Supplier {
    const supplierObj: Supplier = {
      id: this.supplier ? this.supplier.id : '',
      supplierName: this.supplierForm.get('supplierName')?.value,
      contactPerson: this.supplierForm.get('contactPerson')?.value,
      mobileNo: this.supplierForm.get('mobileNo')?.value,
      phoneNo: this.supplierForm.get('phoneNo')?.value,
      website: this.supplierForm.get('website')?.value,
      description: this.supplierForm.get('description')?.value,
      email: this.supplierForm.get('email')?.value,
      url: '',
      taxNumber: this.supplierForm.get('taxNumber')?.value,
      billingAddress: this.supplierForm.get('billingAddress')?.value,
      billingAddressId: this.supplierForm.get('billingAddressId')?.value,
      shippingAddress: this.supplierForm.get('shippingAddress')?.value,
      shippingAddressId: this.supplierForm.get('shippingAddressId')?.value,
    };
    return supplierObj;
  }

  onSupplierList() {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/supplier']);
    }
  }
}
