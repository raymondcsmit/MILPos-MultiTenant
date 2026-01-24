import { Component, inject } from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Product } from '@core/domain-classes/product';
import {
  ProductResourceParameter,
  ProductType,
} from '@core/domain-classes/product-resource-parameter';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { PurchaseOrderItemTax } from '@core/domain-classes/purchase-order-item-tax';
import { PurchaseOrderStatusEnum } from '@core/domain-classes/purchase-order-status';
import { Supplier } from '@core/domain-classes/supplier';
import { SupplierResourceParameter } from '@core/domain-classes/supplier-resource-parameter';
import { Tax } from '@core/domain-classes/tax';
import { CommonService } from '@core/services/common.service';
import { QuantitiesUnitPriceTaxPipe } from '@shared/pipes/quantities-unitprice-tax.pipe';
import { QuantitiesUnitPricePipe } from '@shared/pipes/quantities-unitprice.pipe';
import { ToastrService } from '@core/services/toastr.service';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { Operators } from '@core/domain-classes/operator';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PurchaseDeliveryStatusEnum } from '@core/domain-classes/purchase-delivery-status';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@environments/environment';
import { PurchaseOrderRequestStore } from '../purchase-order-request-store';
import { toObservable } from '@angular/core/rxjs-interop';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { AsyncPipe } from '@angular/common';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { SupplierService } from '../../supplier/supplier.service';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { ProductService } from '../../product/product.service';
import { SupplierDetailComponent } from '../../supplier/supplier-detail/supplier-detail.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { discountValidator } from '@shared/validators/discount-validator';

@Component({
  selector: 'app-purchase-order-request-add-edit',
  templateUrl: './purchase-order-request-add-edit.component.html',
  styleUrls: ['./purchase-order-request-add-edit.component.scss'],
  viewProviders: [QuantitiesUnitPricePipe, QuantitiesUnitPriceTaxPipe],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatSelectModule,
    MatDividerModule,
    MatAutocompleteModule,
    CustomCurrencyPipe,
    RouterModule,
    CustomCurrencyPipe,
    HasClaimDirective,
    QuantitiesUnitPricePipe,
    QuantitiesUnitPriceTaxPipe,
    MatCardModule,
    MatButtonModule,
    AsyncPipe,
    MatIconModule,
    MatRadioModule
  ]
})
export class PurchaseOrderRequestAddEditComponent extends BaseComponent {
  purchaseOrderForm!: UntypedFormGroup;
  suppliers: Supplier[] = [];
  supplierResource: SupplierResourceParameter;
  unitsMap: { [key: string]: UnitConversation[] } = {};
  unitConversationlist: UnitConversation[] = [];
  taxsMap: { [key: string]: Tax[] } = {};
  totalBeforeDiscount: number = 0;
  totalAfterDiscount: number = 0;
  totalDiscount: number = 0;
  grandTotal: number = 0;
  totalTax: number = 0;
  purchaseOrder!: PurchaseOrder;
  isEdit: boolean = false;
  locations: BusinessLocation[] = [];
  productList$!: Observable<Product[]>;
  baseUrl = environment.apiUrl;
  productNameControl: FormControl = new FormControl();
  supplierNameControl: FormControl = new FormControl();
  barCodeNameControl: FormControl = new FormControl();
  purchaseOrderRequestStore = inject(PurchaseOrderRequestStore);
  get purchaseOrderItemsArray(): UntypedFormArray {
    return <UntypedFormArray>this.purchaseOrderForm.get('purchaseOrderItems');
  }
  taxes: Tax[] = [];
  totalRoundOff: number = 0;

  constructor(
    private fb: UntypedFormBuilder,
    private supplierService: SupplierService,
    private toastrService: ToastrService,
    private purchaseOrderService: PurchaseOrderService,
    private router: Router,
    private commonService: CommonService,
    private productService: ProductService,
    private route: ActivatedRoute,
    private quantitiesUnitPricePipe: QuantitiesUnitPricePipe,
    private quantitiesUnitPriceTaxPipe: QuantitiesUnitPriceTaxPipe,
    private dialog: MatDialog
  ) {
    super();
    this.redirectListPage();
    this.getLangDir();
    this.supplierResource = new SupplierResourceParameter();

  }

  ngOnInit(): void {
    this.unitConversationlist = [...this.route.snapshot.data['units']];
    this.taxes = [...this.route.snapshot.data['taxs']]
    this.createPurchaseOrder();
    this.supplierNameChangeValue();
    this.getProductByBarCodeValue();
    this.productNameControlOnChange();
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
        return this.productService.getProductsDropdown(productResource);
      })
    );
  }

  onProductSelection(product: Product) {
    if (product.hasVariant) {
      let productResource = new ProductResourceParameter();
      productResource.parentId = product.id;
      productResource.productType = ProductType.VariantProduct;
      this.productService.getProductsDropdown(productResource).subscribe(
        (resp: Product[]) => {
          const products = [...resp];
          for (let index = 0; index < products.length; index++) {
            this.createPurchaseOrderItem(products[index]);
          }
          this.getAllTotal();
        });
    } else {
      this.createPurchaseOrderItem(product);
      this.getAllTotal();
    }
    this.productNameControl.setValue('');
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0 && !this.purchaseOrder) {
        this.purchaseOrderForm.patchValue({
          locationId: locationResponse.selectedLocation
        });
      }
    });
  }

  clearFormArray() {
    while (this.purchaseOrderItemsArray.length !== 0) {
      this.purchaseOrderItemsArray.removeAt(0);
    }
  }

  createPurchaseOrder() {
    this.route.data
      .pipe()
      .subscribe((purchaseOrderData: any) => {
        this.purchaseOrder = purchaseOrderData.purchaseorder;
        if (this.purchaseOrder) {
          const poCreatedDate = new Date(this.purchaseOrder.poCreatedDate);
          this.isEdit = true;
          this.purchaseOrderForm = this.fb.group({
            locationId: [
              { value: this.purchaseOrder.locationId, disabled: true },
            ],
            orderNumber: [
              { value: this.purchaseOrder.orderNumber, disabled: false },
              [Validators.required],
            ],
            deliveryDate: [
              this.purchaseOrder.deliveryDate,
              [Validators.required],
            ],
            poCreatedDate: [poCreatedDate,
              [Validators.required],
            ],
            poCreatedTime: [
              poCreatedDate
            ],
            deliveryStatus: [this.purchaseOrder.deliveryStatus],
            supplierId: [this.purchaseOrder.supplierId, [Validators.required]],
            note: [this.purchaseOrder.note],
            termAndCondition: [this.purchaseOrder.termAndCondition],
            purchaseOrderItems: this.fb.array([]),
          });
          this.purchaseOrder.purchaseOrderItems.forEach((item) => {
            this.patchPurchaseOrderItem(item);
          });
          this.getSuppliers();
          this.getAllTotal();
        } else {
          this.isEdit = false;
          this.getSuppliers();
          this.purchaseOrderForm = this.fb.group({
            orderNumber: ['', [Validators.required]],
            deliveryDate: [this.CurrentDate, [Validators.required]],
            poCreatedDate: [this.CurrentDate, [Validators.required]],
            poCreatedTime: [new Date()],
            deliveryStatus: [PurchaseDeliveryStatusEnum.Pending],
            supplierId: ['', [Validators.required]],
            locationId: ['', [Validators.required]],
            note: [''],
            termAndCondition: [''],
            purchaseOrderItems: this.fb.array([]),
          });
          this.getNewPurchaseOrderNumber();
        }
        this.getBusinessLocations();
      });
  }

  getProductByBarCodeValue() {
    this.sub$.sink = this.barCodeNameControl
      .valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          if (c) {
            const productResource = new ProductResourceParameter();
            productResource.barcode = c
            return this.productService.getProductsDropdown(productResource);
          }
          return of([]);
        })
      )
      .subscribe(
        (resp: Product[]) => {
          if (resp) {
            if (resp.length == 1) {
              if (this.purchaseOrderItemsArray.length == 1) {
                if (!this.purchaseOrderItemsArray.controls[0].get('productId')?.value) {
                  this.onRemovePurchaseOrderItem(0);
                }
              }
              const product: Product = resp[0];
              this.createPurchaseOrderItem(product);
              this.getAllTotal();
            } else {
              this.toastrService.warning(this.translationService.getValue('PRODUCT_NOT_FOUND'));
            }
            this.barCodeNameControl.setValue('');
          }
        });
  }

  patchPurchaseOrderItem(purchaserOrderItem: PurchaseOrderItem) {
    this.taxsMap[this.purchaseOrderItemsArray.length] = [...this.route.snapshot.data['taxs']];
    this.unitsMap[this.purchaseOrderItemsArray.length] = this.unitConversationlist.filter(
      (c) => c.id == purchaserOrderItem.product?.unitId || c.parentId == purchaserOrderItem.product?.unitId);

    const taxIds = purchaserOrderItem.purchaseOrderItemTaxes.map((c) => c.taxId);

    let percentage = 0;

    if (this.taxes.length > 0 && taxIds && taxIds.length > 0) {
      const filteredTaxes = this.taxes.filter(tax => taxIds?.includes(tax.id));
      if (filteredTaxes && filteredTaxes.length > 0) {
        percentage = filteredTaxes.reduce((sum: number, prodTax: Tax) => sum + (prodTax?.percentage ?? 0), 0) ?? 0;
      }
    }

    const formGroup = this.fb.group({
      productId: [purchaserOrderItem.productId, [Validators.required]],
      productName: [purchaserOrderItem.product?.name],
      productUrl: [purchaserOrderItem.product?.productUrl],
      purchasePrice: [purchaserOrderItem.product?.purchasePrice],
      unitPrice: [purchaserOrderItem.unitPrice, [Validators.required, Validators.min(0.1)]],
      quantity: [purchaserOrderItem.quantity, [Validators.required, Validators.min(1)]],
      taxIds: [taxIds],
      unitId: [purchaserOrderItem.unitId, [Validators.required]],
      discountPercentage: [purchaserOrderItem.discountPercentage, [Validators.min(0), Validators.max(100)]],
      discountType: [purchaserOrderItem.discountType],
      total: [0],
      taxPercenatage: [percentage]
    }, { validators: discountValidator });

    this.purchaseOrderItemsArray.push(formGroup);
  }

  createPurchaseOrderItem(product: Product) {
    let purchaseOrderItems: PurchaseOrderItem[] = this.purchaseOrderItemsArray.value;
    var existingProductIndex = purchaseOrderItems.findIndex((c) => c.productId == product.id);
    if (existingProductIndex >= 0) {
      let iteamToUpdate = purchaseOrderItems[existingProductIndex];
      this.purchaseOrderItemsArray.at(existingProductIndex).get('quantity')?.patchValue(iteamToUpdate.quantity + 1);
    } else {
      this.taxsMap[this.purchaseOrderItemsArray.length] = [...this.route.snapshot.data['taxs']];
      this.unitsMap[this.purchaseOrderItemsArray.length] = this.unitConversationlist.filter(
        (c) => c.id == product.unitId || c.parentId == product.unitId);

      const taxIds = product.productTaxes?.map((c) => c.taxId);
      let percentage = 0;

      if (this.taxes.length > 0 && taxIds && taxIds.length > 0) {
        const filteredTaxes = this.taxes.filter(tax => taxIds?.includes(tax.id));
        if (filteredTaxes && filteredTaxes.length > 0) {
          percentage = filteredTaxes.reduce((sum: number, prodTax: Tax) => sum + (prodTax?.percentage ?? 0), 0) ?? 0;
        }
      }
      const formGroup = this.fb.group({
        productId: [product.id, [Validators.required]],
        productName: [product.name],
        productUrl: [product.productUrl],
        purchasePrice: [product.purchasePrice],
        unitPrice: [product.purchasePrice, [Validators.required, Validators.min(0.1)]],
        quantity: [1, [Validators.required, Validators.min(1)]],
        taxIds: [taxIds],
        unitId: [product.unitId, [Validators.required]],
        discountPercentage: [0, [Validators.min(0), Validators.max(100)]],
        discountType: ['fixed'],
        total: [0],
        taxPercenatage: [percentage]
      }, { validators: discountValidator });
      this.purchaseOrderItemsArray.push(formGroup);
    }
  }

  getAllTotal() {
    let purchaseOrderItems: PurchaseOrderItem[] = this.purchaseOrderForm.get('purchaseOrderItems')?.value;
    this.totalBeforeDiscount = 0;
    this.grandTotal = 0;
    this.totalDiscount = 0;
    this.totalRoundOff = 0;
    this.totalTax = 0;
    if (purchaseOrderItems && purchaseOrderItems.length > 0) {
      purchaseOrderItems.forEach((po, index) => {
        po.discountPercentage = po.discountPercentage ?? 0;
        if (po.unitPrice && po.quantity) {
          const totalBeforeDiscount = this.totalBeforeDiscount + parseFloat(
            this.quantitiesUnitPricePipe.transform(po.quantity, po.unitPrice)
          );

          let percentage = 0;
          if (this.taxes.length > 0 && po.taxIds && po.taxIds.length > 0) {
            const filteredTaxes = this.taxes.filter(tax => po.taxIds?.includes(tax.id));
            if (filteredTaxes && filteredTaxes.length > 0) {
              percentage = filteredTaxes.reduce((sum: number, prodTax: Tax) => sum + (prodTax?.percentage ?? 0), 0) ?? 0;
            }
          }

          const itemGradTotal = parseFloat(
            this.quantitiesUnitPricePipe.transform(
              po.quantity,
              po.unitPrice,
              po.discountPercentage,
              po.taxIds,
              this.taxes,
              po.discountType
            ));
          const total = parseFloat(itemGradTotal.toFixed(2))
          this.purchaseOrderItemsArray.controls[index].patchValue({
            total: Math.round(total),
            taxPercentage: percentage
          });

          this.totalBeforeDiscount = parseFloat(totalBeforeDiscount.toFixed(2));
          const gradTotal = this.grandTotal + parseFloat(this.quantitiesUnitPricePipe.transform(
            po.quantity,
            po.unitPrice,
            po.discountPercentage,
            po.taxIds,
            this.taxsMap[index],
            po.discountType
          ));

          this.grandTotal = parseFloat(gradTotal.toFixed(2));
          const totalTax = this.totalTax + parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              po.quantity,
              po.unitPrice,
              po.discountPercentage,
              po.taxIds,
              this.taxsMap[index],
              po.discountType
            )
          );
          this.totalTax = parseFloat(totalTax.toFixed(2));
          const totalDiscount = this.totalDiscount + parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              po.quantity,
              po.unitPrice,
              po.discountPercentage,
              po.discountType
            )
          );
          this.totalDiscount = parseFloat(totalDiscount.toFixed(2));
        }
      });
      this.totalRoundOff = this.grandTotal - Math.floor(this.grandTotal);
      this.grandTotal = Math.floor(this.grandTotal);
    }
  }

  onDiscountTypeChange(index: number) {
    const formGroup = this.purchaseOrderItemsArray.controls[index];
    const discountPercentage = parseFloat(formGroup.get('discountPercentage')?.value) || 0;
    if (discountPercentage > 0) {
      formGroup.get('discountPercentage')?.setValue(0);
      formGroup.get('discountPercentage')?.updateValueAndValidity();
      this.getAllTotal();
    }
  }

  onTotalChange(index: number) {
    const formGroup = this.purchaseOrderItemsArray.controls[index];
    const grandTotal = parseFloat(formGroup.get('total')?.value) || 0;
    const quantity = parseFloat(formGroup.get('quantity')?.value) || 1;
    const discountType = formGroup.get('discountType')?.value;
    const discountPercentage = parseFloat(formGroup.get('discountPercentage')?.value) || 0;
    const productId = formGroup.get('productId')?.value;
    if (productId) {
      const percentage = formGroup.get('taxPercentage')?.value ?? 0;
      let subTotal = 0;
      if (discountType === 'fixed') {
        subTotal = (grandTotal / (1 + percentage / 100)) + discountPercentage;
      } else {
        subTotal = grandTotal / ((1 + percentage / 100) * (1 - discountPercentage / 100));
      }
      const newUnitPrice = subTotal / quantity;
      formGroup.patchValue({
        unitPrice: parseFloat(newUnitPrice.toFixed(2))
      });
      this.getAllTotal();
    }
  }
  onUnitPriceChange() {
    this.getAllTotal();
  }

  onQuantityChange() {
    this.getAllTotal();
  }

  onDiscountChange() {
    this.getAllTotal();
  }

  onTaxSelectionChange() {
    this.getAllTotal();
  }

  onRemovePurchaseOrderItem(index: number) {
    this.purchaseOrderItemsArray.removeAt(index);
    this.getAllTotal();
  }

  onUnitSelectionChange(unitId: any, index: number) {
    const purchasePrice: number = this.purchaseOrderItemsArray.controls[index].get('purchasePrice')?.value;
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
      this.purchaseOrderItemsArray.controls[index].patchValue({
        unitPrice: price,
      });
    } else {
      this.purchaseOrderItemsArray.controls[index].patchValue({
        unitPrice: purchasePrice,
        unitId: unitId,
      });
    }
  }

  getNewPurchaseOrderNumber() {
    if (!this.purchaseOrder) {
      this.purchaseOrderService
        .getNewPurchaseOrderNumber(false)
        .subscribe((purchaseOrder) => {
          this.purchaseOrderForm.patchValue({
            orderNumber: purchaseOrder.orderNumber,
          });
        });
    }
  }

  supplierNameChangeValue() {
    this.sub$.sink = this.supplierNameControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((c) => {
        this.supplierResource.supplierName = c;
        this.supplierResource.id = '';
        return this.supplierService.getSuppliersForDropDown(this.supplierResource.supplierName, this.supplierResource.id);
      })
    )
      .subscribe(
        (resp: Supplier[]) => {
          this.suppliers = resp;
        });
  }

  getSuppliers() {
    if (this.purchaseOrder) {
      this.supplierResource.id = this.purchaseOrder.supplierId;
    } else {
      this.supplierResource.supplierName = '';
      this.supplierResource.id = '';
    }
    this.supplierService
      .getSuppliersForDropDown(this.supplierResource.supplierName, this.supplierResource.id)
      .subscribe((resp) => {
        this.suppliers = resp;
      });
  }

  onPurchaseOrderSubmit() {
    if (!this.purchaseOrderForm.valid) {
      this.purchaseOrderForm.markAllAsTouched();
    } else {
      if (
        this.purchaseOrder &&
        this.purchaseOrder.purchaseOrderStatus ===
        PurchaseOrderStatusEnum.Return
      ) {
        this.toastrService.error(
          this.translationService.getValue('RETURN_PURCHASE_ORDER_CANT_BE_EDITED')
        );
        return;
      }
      const purchaseOrder = this.buildPurchaseOrder();
      if (purchaseOrder.purchaseOrderItems.length === 0) {
        this.toastrService.error(
          this.translationService.getValue('PLEASE_SELECT_ATLEASE_ONE_PRODUCT')
        );
        return;
      }
      this.purchaseOrderRequestStore.addUpdatePurchaseOrder(purchaseOrder);

      // if (purchaseOrder.id) {
      //   this.purchaseOrderService.updatePurchaseOrder(purchaseOrder).subscribe(
      //     (c: PurchaseOrder) => {
      //       this.toastrService.success(
      //         this.translationService.getValue('PURCHASE_REQUEST_SAVED_SUCCESSFULLY')
      //       );
      //       this.router.navigate([redirectUrl]);
      //     });
      // } else {
      //   this.purchaseOrderService.addPurchaseOrder(purchaseOrder).subscribe(
      //     (c: PurchaseOrder) => {
      //       this.toastrService.success(
      //         this.translationService.getValue('PURCHASE_REQUEST_SAVED_SUCCESSFULLY')
      //       );
      //       this.router.navigate([redirectUrl]);
      //     });
      // }
    }
  }

  redirectListPage() {
    toObservable(this.purchaseOrderRequestStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        this.router.navigate(['/purchase-order-request/list']);
      }
    });
  }

  buildPurchaseOrder() {

    const poCreatedDate = this.purchaseOrderForm.get('poCreatedDate')?.value;
    const poCreatedTime = this.purchaseOrderForm.get('poCreatedTime')?.value;
    if (poCreatedTime) {
      //Set time into date
      poCreatedDate.setHours(poCreatedTime.getHours());
      poCreatedDate.setMinutes(poCreatedTime.getMinutes());
    } else {
      //Set current time into date
      poCreatedDate.setHours(new Date().getHours());
      poCreatedDate.setMinutes(new Date().getMinutes());
    }

    const purchaseOrder: PurchaseOrder = {
      id: this.purchaseOrder ? this.purchaseOrder.id : '',
      orderNumber: this.purchaseOrderForm.get('orderNumber')?.value,
      deliveryDate: this.purchaseOrderForm.get('deliveryDate')?.value,
      deliveryStatus: this.purchaseOrderForm.get('deliveryStatus')?.value,
      isPurchaseOrderRequest: true,
      poCreatedDate: poCreatedDate,
      purchaseOrderStatus: PurchaseOrderStatusEnum.Not_Return,
      supplierId: this.purchaseOrderForm.get('supplierId')?.value,
      totalAmount: this.grandTotal,
      totalDiscount: this.totalDiscount,
      totalTax: this.totalTax,
      note: this.purchaseOrderForm.get('note')?.value,
      termAndCondition: this.purchaseOrderForm.get('termAndCondition')?.value,
      purchaseOrderItems: [],
      locationId: this.purchaseOrderForm.get('locationId')?.value,
      totalRoundOff: this.totalRoundOff,
      totalRefundAmount: 0
    };

    const purchaseOrderItems: PurchaseOrderItem[] = this.purchaseOrderForm.get('purchaseOrderItems')?.value;
    if (purchaseOrderItems && purchaseOrderItems.length > 0) {
      purchaseOrderItems.forEach((po, index) => {
        po.discountPercentage = po.discountPercentage ?? 0;
        purchaseOrder.purchaseOrderItems.push({
          discount: parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              po.quantity,
              po.unitPrice,
              po.discountPercentage,
              po.discountType
            )
          ),
          discountPercentage: po.discountPercentage,
          discountType: po.discountType,
          productId: po.productId,
          unitId: po.unitId,
          quantity: po.quantity,
          taxValue: parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              po.quantity,
              po.unitPrice,
              po.discountPercentage,
              po.taxIds,
              this.taxsMap[index],
              po.discountType
            )
          ),
          unitPrice: po.unitPrice,
          purchaseOrderItemTaxes: po.taxIds
            ? [
              ...po.taxIds.map((element) => {
                const purchaseOrderItemTaxes: PurchaseOrderItemTax = {
                  taxId: element,
                  taxValue: this.quantitiesUnitPriceTaxPipe.transform(
                    po.quantity,
                    po.unitPrice,
                    po.discountPercentage,
                    [element],
                    this.taxsMap[index],
                    po.discountType
                  )
                };
                return purchaseOrderItemTaxes;
              }),
            ]
            : [],
        });
      });
    }
    return purchaseOrder;
  }

  addNewSupplier() {
    const dialogRef = this.dialog.open(SupplierDetailComponent, {
      data: Object.assign({}),
      maxWidth: '70vw',
      maxHeight: '90vh',
      width: '100%',
    });
    dialogRef.afterClosed().subscribe((supplier?: Supplier) => {
      if (supplier) {
        this.suppliers.push(supplier);
        this.purchaseOrderForm.get('supplierId')?.patchValue(supplier.id);
      }
    });
  }
}
