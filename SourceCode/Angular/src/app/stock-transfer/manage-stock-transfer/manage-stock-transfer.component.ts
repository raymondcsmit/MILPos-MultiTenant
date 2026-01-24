import { Component } from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '@core/domain-classes/product';
import {
  ProductResourceParameter,
  ProductType,
} from '@core/domain-classes/product-resource-parameter';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { BusinessLocation } from '@core/domain-classes/business-location';
import {
  SalesDeliveryStatus,
  SalesDeliveryStatusEnum,
  salesDeliveryStatuses,
} from '@core/domain-classes/sales-delivery-statu';
import { StockTransferService } from '../stock-transfer.service';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { StockTransferItem } from '@core/domain-classes/stockTransferItem';
import { Observable, of } from 'rxjs';
import { environment } from '@environments/environment';
import { Operators } from '@core/domain-classes/operator';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AsyncPipe } from '@angular/common';
import { BaseComponent } from '../../base.component';
import { ProductService } from '../../product/product.service';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductStockAlertDailogComponent } from '@shared/product-stock-alert-dailog/product-stock-alert-dailog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-manage-stock-transfer',
  templateUrl: './manage-stock-transfer.component.html',
  styleUrls: ['./manage-stock-transfer.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatSelectModule,
    MatAutocompleteModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe
  ]
})
export class ManageStockTransferComponent extends BaseComponent {
  stockTransferForm!: UntypedFormGroup;
  unitsMap: { [key: string]: UnitConversation[] } = {};
  unitConversationlist: UnitConversation[] = [];
  stockTransfer!: StockTransfer;
  isEdit: boolean = false;
  locations: BusinessLocation[] = [];
  locationList: BusinessLocation[] = [];
  salesDeliveryStatus: SalesDeliveryStatus[] = salesDeliveryStatuses;
  productList$!: Observable<Product[]>;
  baseUrl = environment.apiUrl;
  barCodeNameControl: FormControl = new FormControl();
  productNameControl: FormControl = new FormControl();

  get stockTransferItemsArray(): UntypedFormArray {
    return <UntypedFormArray>this.stockTransferForm.get('stockTransferItems');
  }

  constructor(
    private fb: UntypedFormBuilder,
    private toastrService: ToastrService,
    private stockTransferService: StockTransferService,
    private router: Router,
    private productService: ProductService,
    private route: ActivatedRoute,
    private commonService: CommonService,
    private dialog: MatDialog
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.unitConversationlist = [...this.route.snapshot.data['units']];
    this.createStockTransfer();
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

  getProductByBarCodeValue() {
    this.sub$.sink = this.barCodeNameControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((c) => {
        if (c) {
          const productResource = new ProductResourceParameter();
          productResource.barcode = c
          productResource.productType = ProductType.VariantProduct;
          return this.productService.getProductsDropdown(productResource);
        }
        return of([]);
      })
    )
      .subscribe(
        (resp: Product[]) => {
          if (resp) {
            if (resp.length == 1) {
              if (this.stockTransferItemsArray.length == 1) {
                if (!this.stockTransferItemsArray.controls[0].get('productId')?.value) {
                  this.onRemovestockTransferItem(0);
                }
              }
              const product: Product = resp[0];
              this.createStockTransferItem(product);
            } else {
              this.toastrService.warning(this.translationService.getValue('PRODUCT_NOT_FOUND'));
            }
          }
        });
  }

  onProductSelection(product: Product) {
    if (product.hasVariant) {
      const productResource = new ProductResourceParameter();
      productResource.parentId = product.id;
      productResource.productType = ProductType.VariantProduct;
      this.productService.getProductsDropdown(productResource).subscribe(
        (resp: Product[]) => {
          const products = [...resp];
          for (let index = 0; index < products.length; index++) {
            this.createStockTransferItem(products[index]);
          }
        });
    } else {
      this.createStockTransferItem(product);
    }
    this.productNameControl.setValue('');
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0 && !this.stockTransfer) {
        this.stockTransferForm.patchValue({
          locationId: locationResponse.selectedLocation
        });
      }
    });
  }

  getAllLocations() {
    this.commonService.getAllLocations().subscribe((locationResponse) => {
      this.locationList = locationResponse;
    });
  }

  createStockTransfer() {
    this.route.data
      .pipe()
      .subscribe((stockTransferData: any) => {
        this.stockTransfer = stockTransferData.stockTransfer;
        if (this.stockTransfer) {
          this.isEdit = true;
          this.stockTransferForm = this.fb.group({
            referenceNo: [this.stockTransfer.referenceNo, [Validators.required],],
            status: [this.stockTransfer.status],
            fromLocationId: [{ value: this.stockTransfer.fromLocationId, disabled: true },],
            toLocationId: [{ value: this.stockTransfer.toLocationId, disabled: true },],
            notes: [this.stockTransfer.notes],
            transferDate: [this.stockTransfer.transferDate, [Validators.required],],
            stockTransferItems: this.fb.array([]),
          });
          this.stockTransfer.stockTransferItems.forEach((item) => {
            this.createStockTransferItemPatch(item);
          });
        } else {
          this.isEdit = false;
          this.stockTransferForm = this.fb.group({
            referenceNo: ['', [Validators.required]],
            status: [SalesDeliveryStatusEnum.Delivered],
            fromLocationId: ['', [Validators.required]],
            toLocationId: ['', [Validators.required]],
            notes: [''],
            transferDate: [this.CurrentDate, [Validators.required]],
            stockTransferItems: this.fb.array([]),
          });
        }
        this.productNameControlOnChange();
        this.getProductByBarCodeValue();
        this.getBusinessLocations();
        this.getAllLocations();
      });
  }

  createStockTransferItemPatch(
    stockTransferItem: StockTransferItem
  ) {
    this.unitsMap[this.stockTransferItemsArray.length] = this.unitConversationlist.filter(
      (c) => c.id == stockTransferItem.product?.unitId || c.parentId == stockTransferItem.product?.unitId);

    const formGroup = this.fb.group({
      productId: [stockTransferItem.productId, [Validators.required]],
      productName: [stockTransferItem.product?.name],
      productUrl: [stockTransferItem.product?.productUrl],
      unitPrice: [stockTransferItem.unitPrice, [Validators.required]],
      purchasePrice: [stockTransferItem.unitPrice],
      quantity: [stockTransferItem.quantity, [Validators.required]],
      shippingCharge: [stockTransferItem.shippingCharge],
      unitId: [stockTransferItem.unitId, [Validators.required]],
    });
    this.stockTransferItemsArray.push(formGroup);
  }

  createStockTransferItem(product: Product) {
    this.unitsMap[this.stockTransferItemsArray.length] = [...this.route.snapshot.data['units']];
    const formGroup = this.fb.group({
      productId: [product.id, [Validators.required]],
      productName: [product.name],
      productUrl: [product.productUrl],
      purchasePrice: [product.purchasePrice],
      unitPrice: [product.purchasePrice, [Validators.required, Validators.min(0)]],
      shippingCharge: [0],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitId: [product.unitId, [Validators.required]],
    });
    this.stockTransferItemsArray.push(formGroup);
  }

  onChange() {
    if (this.stockTransferForm.get('fromLocationId')?.value === this.stockTransferForm.get('toLocationId')?.value) {
      this.toastrService.warning(this.translationService.getValue('FROM_LOCATION_AND_TO_LOCATION_CAN_NOT_SAME'));
      return;
    }
  }

  onRemovestockTransferItem(index: number) {
    this.stockTransferItemsArray.removeAt(index);
  }

  onUnitSelectionChange(unitId: any, index: number) {
    const purchasePrice: number = this.stockTransferItemsArray.controls[index].get('purchasePrice')?.value;
    const unit = this.unitConversationlist.find((c) => c.id === unitId);

    let price = 0;
    if (unit && unit.value) {
      switch (unit.operator) {
        case Operators.Plush:
          price = purchasePrice + parseFloat(unit.value);
          break;
        case Operators.Minus:
          price = purchasePrice - parseFloat(unit.value);
          break;
        case Operators.Multiply:
          price = purchasePrice * parseFloat(unit.value);
          break;
        case Operators.Divide:
          price = purchasePrice / parseFloat(unit.value);
          break;
      }
      this.stockTransferItemsArray.controls[index].patchValue({ unitPrice: price });
    } else {
      this.stockTransferItemsArray.controls[index].patchValue({
        unitPrice: purchasePrice,
        unitId: unitId,
      });
    }
  }

  onStockTransferSubmit() {
    if (!this.stockTransferForm.valid) {
      this.stockTransferForm.markAllAsTouched();
      return;
    } else {
      if (
        this.stockTransferForm.get('toLocationId')?.value ===
        this.stockTransferForm.get('fromLocationId')?.value
      ) {
        this.toastrService.error(this.translationService.getValue('FROM_LOCATION_AND_TO_LOCATION_CAN_NOT_SAME'));
        return;
      }
      const stockTransfer = this.buildStockTransfer();
      if (stockTransfer.stockTransferItems.length == 0) {
        this.toastrService.error(this.translationService.getValue('PLEASE_SELECT_ATLEASE_ONE_PRODUCT'));
        return;
      }

      const fromLocationId = stockTransfer.fromLocationId as string;
      const productUnits = stockTransfer.stockTransferItems.map(item => ({
        productId: item.productId,
        unitId: item.unitId ?? ''
      }));

      this.productService
        .getProductsInventory(fromLocationId, productUnits)
        .subscribe((resp: any[] = []) => {
          const productsStock = resp.map((c) => {
            const items = stockTransfer.stockTransferItems.filter(x => x.productId === c.productId);
            const itemCount = items.reduce((a, b) => a + b.quantity, 0);
            const stockTransferItem = items[0] ?? null;
            const unitName = stockTransferItem
              ? this.unitConversationlist.find(x => x.id === stockTransferItem.unitId)?.name
              : undefined;

            return {
              id: c.productId,
              name: c.name,
              stock: c.stock,
              itemCount,
              unitName: c.unitName,
              selectedUnitName: unitName,
              unitId: c.unitId,
            };
          });

          const outOfStockProducts = productsStock.filter(c => c.stock < c.itemCount);
          if (outOfStockProducts.length) {
            this.dialog.open(ProductStockAlertDailogComponent, {
              data: outOfStockProducts,
              maxWidth: '50vw',
              maxHeight: '80vh',
            }).afterClosed().subscribe((isProcessed: boolean) => {
              if (isProcessed) {
                this.saveStockTransfer(stockTransfer);
              }
            });
          } else {
            this.saveStockTransfer(stockTransfer);
          }
        });
    }
  }

  saveStockTransfer(stockTransfer: StockTransfer) {
    if (stockTransfer.id) {
      this.stockTransferService
        .updateStockTransfer(stockTransfer.id ?? '', stockTransfer)
        .subscribe((c: StockTransfer) => {
          this.toastrService.success(
            this.translationService.getValue(
              'STOCK_TRANSFER_SAVED_SUCCESSFULLY'
            )
          );
          this.router.navigate(['/stock-transfer/list']);
        });
    } else {
      this.stockTransferService
        .addStockTransfer(stockTransfer)
        .subscribe((c: StockTransfer) => {
          this.toastrService.success(
            this.translationService.getValue(
              'STOCK_TRANSFER_SAVED_SUCCESSFULLY'
            )
          );
          this.router.navigate(['/stock-transfer/list']);
        });
    }
  }

  buildStockTransfer() {
    const stockTransfer: StockTransfer = {
      id: this.stockTransfer ? this.stockTransfer.id : '',
      referenceNo: this.stockTransferForm.get('referenceNo')?.value,
      status: this.stockTransferForm.get('status')?.value,
      fromLocationId: this.stockTransferForm.get('fromLocationId')?.value,
      toLocationId: this.stockTransferForm.get('toLocationId')?.value,
      notes: this.stockTransferForm.get('notes')?.value,
      transferDate: this.stockTransferForm.get('transferDate')?.value,
      totalAmount: 0,
      totalShippingCharge: 0,
      stockTransferItems: []
    };

    const stockTransferItems = this.stockTransferForm.get('stockTransferItems')?.value;
    if (stockTransferItems && stockTransferItems.length > 0) {
      stockTransferItems.forEach((so: any) => {
        stockTransfer.stockTransferItems.push({
          productId: so.productId,
          unitId: so.unitId,
          quantity: so.quantity,
          unitPrice: parseFloat(so.unitPrice),
          shippingCharge: parseFloat(so.shippingCharge),
          subTotal: (parseFloat(so.unitPrice) * so.quantity) + parseFloat(so.shippingCharge),
        });
      });
    }
    stockTransfer.totalShippingCharge = stockTransfer.stockTransferItems.reduce((a, b) => a + (b.shippingCharge ?? 0), 0);
    stockTransfer.totalAmount = stockTransfer.stockTransferItems.reduce((a, b) => a + b.subTotal, 0);
    return stockTransfer;
  }

  onStockTransferList() {
    this.router.navigate(['/stock-transfer/list']);
  }
}
