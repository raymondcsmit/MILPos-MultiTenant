import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { User } from '@core/domain-classes/user';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from '@core/services/toastr.service';
import { CommonService } from '@core/services/common.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Product } from '@core/domain-classes/product';
import {
  ProductResourceParameter,
  ProductType,
} from '@core/domain-classes/product-resource-parameter';

import { UnitConversation } from '@core/domain-classes/unit-conversation';
import {
  debounceTime,
  distinctUntilChanged,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import { DamagedStock } from '@core/domain-classes/damaged-stock';
import { DamagedStore } from '../damaged-store';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '@environments/environment';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { InventoryService } from '../../inventory/inventory.service';
import { ProductService } from '../../product/product.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manage-damaged-stock',
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatDatepickerModule,
    RouterModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe
  ],
  templateUrl: './manage-damaged-stock.component.html',
  styleUrl: './manage-damaged-stock.component.scss',
})
export class ManageDamagedStockComponent
  extends BaseComponent
  implements OnInit {
  damagedForm!: UntypedFormGroup;
  users: User[] = [];
  locations: BusinessLocation[] = [];
  barCodeNameControl: FormControl = new FormControl();
  productNameControl: FormControl = new FormControl();
  unitsMap: { [key: string]: UnitConversation[] } = {};
  productList$: Observable<Product[]> = of([]);
  baseUrl = environment.apiUrl;

  damagedStore = inject(DamagedStore);
  constructor(
    private fb: UntypedFormBuilder,
    private toastrService: ToastrService,
    private activatedRoute: ActivatedRoute,
    private commonService: CommonService,
    private inventoryService: InventoryService,
    private router: Router,
    private productService: ProductService
  ) {
    super();
    this.redirectListPage();
    this.getLangDir();
  }

  get damagedStockItemsArray(): UntypedFormArray {
    return <UntypedFormArray>this.damagedForm.get('damagedStockItems');
  }

  ngOnInit(): void {
    this.createDamagedForm();
    this.getUsers();
    this.getBusinessLocations();
    this.getReportedBy();
  }

  redirectListPage() {
    toObservable(this.damagedStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        this.router.navigate(['/damaged-stock/list']);
      }
    });
  }

  createDamagedForm() {
    var currentDate = this.CurrentDate;
    this.damagedForm = this.fb.group({
      id: [''],
      reportedId: ['', Validators.required],
      reason: [''],
      damagedDate: [currentDate, [Validators.required]],
      locationId: ['', [Validators.required]],
      damagedStockItems: this.fb.array([]),
    });
    this.productNameControlOnChange();
    this.getProductByBarCodeValue();
    this.getBusinessLocations();
  }

  productNameControlOnChange() {
    this.productList$ = this.productNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c) => {
        if (!c) {
          return of([]);
        }
        const productResource = new ProductResourceParameter();
        productResource.name = c;
        productResource.pageSize = 10;
        productResource.skip = 0;
        productResource.productType = ProductType.VariantProduct;
        return this.productService.getProductsDropdown(productResource);
      })
    );
  }

  onLocationChange() {
    this.damagedStockItemsArray.clear();
    this.damagedForm.get('reason')?.setValue('');
  }

  onRemoveDamagedStockItem(index: number) {
    this.damagedStockItemsArray.removeAt(index);
  }

  getProductByBarCodeValue() {
    this.sub$.sink = this.barCodeNameControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          if (c) {
            const productResource = new ProductResourceParameter();
            productResource.barcode = c;
            productResource.productType = ProductType.VariantProduct;
            return this.productService.getProductsDropdown(productResource);
          }
          return of([]);
        })
      )
      .subscribe((resp: Product[]) => {
        if (resp) {
          if (resp.length == 1) {
            if (this.damagedStockItemsArray.length == 1) {
              if (
                !this.damagedStockItemsArray.controls[0].get('productId')?.value
              ) {
                this.onRemoveDamagedStockItem(0);
              }
            }
            const product: Product = resp[0];
            const locationId = this.damagedForm.get('locationId')?.value;
            const productId = product.id ?? '';
            this.createDamagedStockItem(product, productId, locationId);
          } else {
            this.toastrService.warning(
              this.translationService.getValue('PRODUCT_NOT_FOUND')
            );
          }
        }
      });
  }

  getInventory(productId: string, locationId: string, index: number) {
    this.inventoryService
      .getInventoryByProductId(productId, locationId)
      .subscribe((resp) => {
        if (resp) {
          this.damagedStockItemsArray.controls[index]
            .get('stock')
            ?.setValue(resp);
        }
      });
  }

  onProductSelection(product: Product) {
    const products = this.damagedForm.get('damagedStockItems')?.getRawValue();
    if (
      products.length == 0 ||
      products.filter((c: any) => c.productId == product.id).length == 0
    ) {
      if (product.hasVariant) {
        const productResource = new ProductResourceParameter();
        productResource.parentId = product.id;
        productResource.productType = ProductType.VariantProduct;
        this.productService
          .getProductsDropdown(productResource)
          .subscribe((resp: Product[]) => {
            const products = [...resp];
            for (let index = 0; index < products.length; index++) {
              const locationId = this.damagedForm.get('locationId')?.value;
              const productId = product.id;
              this.createDamagedStockItem(
                products[index],
                productId ?? '',
                locationId
              );
            }
          });
      } else {
        const locationId = this.damagedForm.get('locationId')?.value;
        const productId = product.id ?? '';
        this.createDamagedStockItem(product, productId, locationId);
      }
    }
    this.productNameControl.setValue('');
  }

  createDamagedStockItem(
    product: Product,
    productId: string,
    locationId: string
  ) {
    const index = this.damagedStockItemsArray.length;
    this.unitsMap[index] = [...this.activatedRoute.snapshot.data['units']];

    const formGroup = this.fb.group({
      productId: [product.id, [Validators.required]],
      productName: [product.name],
      productUrl: [product.productUrl],
      stock: [{ value: 0, disabled: true }],
      damagedQuantity: [
        0,
        [Validators.required, Validators.min(1), this.maxStockValidator() ],
      ],
      unitId: [
        { value: product.unitId, disabled: true },
        [Validators.required],
      ],
    });

    this.damagedStockItemsArray.push(formGroup);

    if (productId && locationId) {
      this.getInventory(productId, locationId, index);
    }
  }

  maxStockValidator(): (
    control: FormControl
  ) => { [key: string]: boolean } | null {
    return (control: FormControl) => {
      if (!control.parent) return null;

      const stock = control.parent.get('stock')?.value;
      const quantity = control.value;

      if (quantity > stock) {
        return { maxStockExceeded: true };
      }
      return null;
    };
  }

  getBusinessLocations() {
    this.commonService
      .getLocationsForCurrentUser()
      .subscribe((locationResponse) => {
        this.locations = locationResponse.locations;
        if (this.locations?.length > 0) {
          this.damagedForm.patchValue({
            locationId: locationResponse.selectedLocation,
          });
        }
      });
  }

  getReportedBy() {
    this.commonService.getUsers().subscribe((resp: User[]) => {
      this.users = resp;
      if (this.users?.length > 0) {
        this.damagedForm.patchValue({
          reportedId: this.users[0].id,
        });
      }
    });
  }

  getUsers() {
    this.commonService.getAllUsers().subscribe((resp: User[]) => {
      this.users = resp;
    });
  }

  buildDamagedStock() {
    const damagedStock: DamagedStock = {
      id: this.damagedForm.get('id')?.value,
      reportedId: this.damagedForm.get('reportedId')?.value,
      reason: this.damagedForm.get('reason')?.value,
      damagedDate: this.damagedForm.get('damagedDate')?.value,
      locationId: this.damagedForm.get('locationId')?.value,
      damagedStockItems: [],
    };

    const damagedStockItems = this.damagedForm
      .get('damagedStockItems')
      ?.getRawValue();
    if (damagedStockItems && damagedStockItems.length > 0) {
      damagedStockItems.forEach((so: any) => {
        damagedStock.damagedStockItems.push({
          productId: so.productId,
          damagedQuantity: so.damagedQuantity,
          unitId: so.unitId,
        });
      });
    }
    return damagedStock;
  }

  onDamagedSubmit() {
    if (this.damagedForm.invalid) {
      this.damagedForm.markAllAsTouched();
      return;
    }

    if (this.damagedStockItemsArray.length === 0) {
      this.toastrService.error(
        this.translationService.getValue(
          'AT_LEAST_ONE_PRODUCT_MUST_BE_SELECTED'
        )
      );
      return;
    }

    const damagedStock = this.buildDamagedStock();
    this.damagedStore.addUpdateDamagedStock(damagedStock);
  }
}
