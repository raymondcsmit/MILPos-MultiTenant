import { HttpResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderItem } from '@core/domain-classes/purchase-order-item';
import { PurchaseOrderItemTax } from '@core/domain-classes/purchase-order-item-tax';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { PurchaseOrderStatusEnum } from '@core/domain-classes/purchase-order-status';
import { Supplier } from '@core/domain-classes/supplier';
import { SupplierResourceParameter } from '@core/domain-classes/supplier-resource-parameter';
import { Tax } from '@core/domain-classes/tax';
import { Unit } from '@core/domain-classes/unit';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs/operators';
import { Location } from '@angular/common';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { environment } from '@environments/environment';
import { PurchaseOrderReturnStore } from '../purchase-order-request-store';
import { toObservable } from '@angular/core/rxjs-interop';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BaseComponent } from '../../base.component';
import { PurchaseOrderStore } from '../../purchase-order/purchase-order-store';
import { SupplierService } from '../../supplier/supplier.service';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { QuantitiesUnitPriceReturnPipe } from '@shared/pipes/quantities-unitprice-return.pipe';
import { QuantitiesUnitPriceTaxReturnPipe } from '@shared/pipes/quantities-unitprice-tax-return.pipe';
import { MatRadioModule } from '@angular/material/radio';
import { QuantitiesUnitPriceDiscountReturnPipe } from '@shared/pipes/quantities-unitprice-discount-return.pipe';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { PaymentMethod, paymentMethods } from '@core/domain-classes/payment-method';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';

@Component({
  selector: 'app-purchase-order-return',
  templateUrl: './purchase-order-return.component.html',
  styleUrls: ['./purchase-order-return.component.scss'],
  viewProviders: [QuantitiesUnitPriceReturnPipe, QuantitiesUnitPriceTaxReturnPipe, UTCToLocalTime],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatDividerModule,
    MatSelectModule,
    CustomCurrencyPipe,
    QuantitiesUnitPriceTaxReturnPipe,
    MatDatepickerModule,
    QuantitiesUnitPriceReturnPipe,
    ReactiveFormsModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    QuantitiesUnitPriceDiscountReturnPipe,
    PaymentMethodPipe
  ]
})
export class PurchaseOrderReturnComponent extends BaseComponent {
  purchaseOrderForm!: UntypedFormGroup;
  purchaseOrderReturnForm!: UntypedFormGroup;
  suppliers: Supplier[] = [];
  suppliersForSearch: Supplier[] = [];
  supplierResource: SupplierResourceParameter;
  purchaseResouce: PurchaseOrderResourceParameter;
  purchaseorders: PurchaseOrder[] = [];
  unitsMap: { [key: string]: Unit[] } = {};
  taxsMap: { [key: string]: Tax[] } = {};
  totalBeforeDiscount: number = 0;
  totalAfterDiscount: number = 0;
  totalDiscount: number = 0;
  grandTotal: number = 0;
  totalTax: number = 0;
  timeoutclear: any;
  purchaseOrder!: PurchaseOrder;
  purchaseOrderRequestList: PurchaseOrder[] = [];
  purchaseOrderResource: PurchaseOrderResourceParameter;
  locations: BusinessLocation[] = [];
  baseUrl = environment.apiUrl;
  purchaseOrderReturnStore = inject(PurchaseOrderReturnStore);
  purchaseOrderStore = inject(PurchaseOrderStore);
  get purchaseOrderItemsArray(): UntypedFormArray {
    return <UntypedFormArray>this.purchaseOrderForm.get('purchaseOrderItems');
  }
  totalRoundOff: number = 0;
  paymentMethodslist: PaymentMethod[] = [];
  constructor(
    private fb: UntypedFormBuilder,
    private supplierService: SupplierService,
    private toastrService: ToastrService,
    private purchaseOrderService: PurchaseOrderService,
    private router: Router,
    private commonService: CommonService,
    private route: ActivatedRoute,
    private quantitiesUnitPriceReturnPipe: QuantitiesUnitPriceReturnPipe,
    private quantitiesUnitPriceTaxReturnPipe: QuantitiesUnitPriceTaxReturnPipe,
    private location: Location,
    private uTCToLocalTime: UTCToLocalTime,
    private purchaseOrderPaymentService: PurchaseOrderPaymentService) {
    super();
    this.redirectListPage();
    this.getLangDir();
    this.supplierResource = new SupplierResourceParameter();
    this.purchaseResouce = new PurchaseOrderResourceParameter();
    this.purchaseOrderResource = new PurchaseOrderResourceParameter();
    this.purchaseOrderResource.pageSize = 50;
    this.purchaseOrderResource.orderBy = 'poCreatedDate asc';
    this.purchaseOrderResource.isPurchaseOrderRequest = true;
  }

  ngOnInit(): void {
    this.paymentMethodsList();
    this.createPurchaseOrderForm();
    this.createPurchaseOrder();
    this.getBusinessLocations();
  }

  paymentMethodsList() {
    this.sub$.sink = this.purchaseOrderPaymentService
      .getPaymentMethod()
      .subscribe((f) => (this.paymentMethodslist = [...f]));
  }

  createPurchaseOrderForm() {
    this.purchaseOrderForm = this.fb.group({
      orderNumber: [{ value: '', disabled: true }],
      filerCustomer: [{ value: '', disabled: true }],
      filerSupplier: [{ value: '', disabled: true }],
      deliveryDate: [{ value: null, disabled: true }],
      poCreatedDate: [{ value: null, disabled: true }],
      deliveryStatus: [{ value: null, disabled: true }],
      supplierId: [{ value: null, disabled: true }],
      locationId: [{ value: null, disabled: true }],
      flatDiscount: [{ value: 0, disabled: true }],
      note: [{ value: '', disabled: false }],
      purchaseOrderItems: this.fb.array([]),
      isSelectPaymentMethod: [false],
      paymentMethod: [paymentMethods[0].id]
    });
  }


  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
    });
  }

  createPurchaseOrderReturnOrder() {
    this.purchaseOrderReturnForm = this.fb.group({
      orderNumber: [''],
      filerSupplier: [''],
      supplierId: [''],
      purchaseOrderId: [''],
      filerPurchaseOrder: [''],
      locationId: [''],
    });
    this.getSuppliers();
    this.supplierNameForSearchChangeValue();
    this.subscribeSupplierChangeEvent();
    this.subscribePurchaseOrderFilterChangeEvent();
    this.onPurchaseOrderChange();
  }

  subscribeSupplierChangeEvent() {
    this.purchaseOrderReturnForm
      .get('supplierId')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.purchaseResouce.supplierId = c;
          this.purchaseResouce.status = PurchaseOrderStatusEnum.Not_Return;
          return this.purchaseOrderService.getAllPurchaseOrder(
            this.purchaseResouce
          );
        })
      )
      .subscribe((resp: HttpResponse<PurchaseOrder[]>) => {
        if (resp && resp.body) {
          this.purchaseorders = [...resp.body];
        }
      });
  }

  subscribePurchaseOrderFilterChangeEvent() {
    this.purchaseOrderReturnForm
      .get('filerPurchaseOrder')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.purchaseResouce.orderNumber = c;
          return this.purchaseOrderService.getAllPurchaseOrder(
            this.purchaseResouce
          );
        })
      )
      .subscribe((resp: HttpResponse<PurchaseOrder[]>) => {
        if (resp && resp.body) {
          this.purchaseorders = [...resp.body];
        }
      });
  }

  clearFormArray() {
    while (this.purchaseOrderItemsArray.length !== 0) {
      this.purchaseOrderItemsArray.removeAt(0);
    }
  }

  onPurchaseOrderChange() {
    this.purchaseOrderReturnForm
      .get('purchaseOrderId')
      ?.valueChanges.subscribe((id) => {
        if (id) {
          this.router.navigate(['/purchase-order-return', id]);
        }
      });
  }

  createPurchaseOrder() {
    this.route.data
      .pipe()
      .subscribe((purchaseOrderData: any) => {
        this.purchaseOrder = purchaseOrderData.purchaseorder;
        if (this.purchaseOrder) {
          this.purchaseOrderService.getPurchaseOrderByIdReturnItems(this.purchaseOrder.id ?? '')
            .subscribe((c: PurchaseOrderItem[]) => {
              this.purchaseOrder = { ...this.purchaseOrder, purchaseOrderItems: [...c] };
              const poCreatedDate = this.uTCToLocalTime.transform(this.purchaseOrder.poCreatedDate, 'short');
              const paidAmount = Math.floor((this.purchaseOrder.totalPaidAmount ?? 0) - (this.purchaseOrder.totalRefundAmount ?? 0))
              this.purchaseOrderForm.patchValue({
                orderNumber: this.purchaseOrder.orderNumber,
                locationId: this.purchaseOrder.locationId,
                filerSupplier: '',
                deliveryDate: this.purchaseOrder.deliveryDate,
                poCreatedDate: poCreatedDate,
                deliveryStatus: this.purchaseOrder.deliveryStatus,
                supplierId: this.purchaseOrder.supplierId,
                note: '',
                isSelectPaymentMethod: paidAmount > 0 ? true : false
              });
              c.forEach((item) => {
                this.patchPurchaseOrderItem(item);
              });
              this.supplierNameChangeValue();
              this.getSuppliers();
              this.getAllTotal();
            })
        } else {
          this.createPurchaseOrderReturnOrder();
          this.purchaseResouce.pageSize = 10;
          this.purchaseResouce.status = PurchaseOrderStatusEnum.Not_Return;
          this.purchaseOrderService
            .getAllPurchaseOrder(this.purchaseResouce)
            .subscribe((resp: HttpResponse<PurchaseOrder[]>) => {
              if (resp && resp.body) {
                this.purchaseorders = [...resp.body];
              }
            });
        }
      });
  }

  onAddAnotherProduct() {
    this.purchaseOrderItemsArray.push(
      this.createPurchaseOrderItem(this.purchaseOrderItemsArray.length)
    );
  }

  // createPurchaseOrderItemPatch(
  //   index: number,
  //   purchaseOrderItem: PurchaseOrderItem
  // ) {
  //   const taxs = purchaseOrderItem.purchaseOrderItemTaxes.map((c) => c.taxId);
  //   const formGroup = this.fb.group({
  //     productId: [{ value: purchaseOrderItem.productId, disabled: true }, [Validators.required]],
  //     productName: [{ value: purchaseOrderItem.product?.name, disabled: true }],
  //     productUrl: [{ value: purchaseOrderItem.product?.productUrl, disabled: true }],
  //     unitPrice: [{ value: purchaseOrderItem.unitPrice, disabled: true }, [Validators.required]],
  //     quantity: [{ value: purchaseOrderItem.quantity, disabled: true }, [Validators.required]],
  //     returnquantity: [{ value: 0, disabled: false }, [Validators.required, Validators.min(0), Validators.max(purchaseOrderItem.quantity)]],
  //     taxIds: [{ value: taxs, disabled: true }],
  //     unitId: [{ value: purchaseOrderItem.unitId, disabled: true }, [Validators.required]],
  //     discountPercentage: [{ value: purchaseOrderItem.discountPercentage, disabled: true }],
  //     discountType: [{ value: purchaseOrderItem.discountType, disabled: true }]
  //   });
  //   this.unitsMap[index] = [...this.route.snapshot.data['units']];
  //   this.taxsMap[index] = [...this.route.snapshot.data['taxs']];
  //   return formGroup;
  // }

  patchPurchaseOrderItem(purchaseOrderItem: PurchaseOrderItem) {
    this.taxsMap[this.purchaseOrderItemsArray.length] = [...this.route.snapshot.data['taxs']];
    const units = [...this.route.snapshot.data['units']];
    this.unitsMap[this.purchaseOrderItemsArray.length] = [...units];
    const taxIds = purchaseOrderItem.purchaseOrderItemTaxes.map((c) => c.taxId);
    const maxQuantities = (purchaseOrderItem.quantity ?? 0) - (purchaseOrderItem.returnItemsQuantities ?? 0)
    console.log("Return Max Validation Quantities", maxQuantities);
    const formGroup = this.fb.group({
      productId: [purchaseOrderItem.productId, [Validators.required]],
      productName: [purchaseOrderItem.product?.name],
      productUrl: [purchaseOrderItem.product?.productUrl],
      unitPrice: [{ value: purchaseOrderItem.unitPrice, disabled: true }, [Validators.required]],
      quantity: [{ value: purchaseOrderItem.quantity, disabled: true }, [Validators.required]],
      returnquantity: [0, [Validators.required, Validators.max(maxQuantities)]],
      taxIds: [{ value: taxIds, disabled: true }],
      unitId: [{ value: purchaseOrderItem.unitId, disabled: true }, [Validators.required]],
      discountPercentage: [{ value: purchaseOrderItem.discountPercentage, disabled: true }],
      discountType: [{ value: purchaseOrderItem.discountType, disabled: true }],
      returnItemsQuantities: [purchaseOrderItem.returnItemsQuantities ?? 0]
    });

    this.purchaseOrderItemsArray.push(formGroup);
  }


  createPurchaseOrderItem(index: number) {
    const formGroup = this.fb.group({
      productId: ['', [Validators.required]],
      productName: [''],
      productUrl: [''],
      unitPrice: [0, [Validators.required]],
      quantity: [0, [Validators.required]],
      taxIds: [],
      unitId: [{ value: null, disabled: true }],
      discountPercentage: [0],
      discountType: ['fixed'],
      total: [0],
      taxPercentage: [0]
    });
    this.unitsMap[index] = [...this.route.snapshot.data['units']];
    this.taxsMap[index] = [...this.route.snapshot.data['taxs']];
    return formGroup;
  }

  getAllTotal() {
    let purchaseOrderItemsArray = this.purchaseOrderForm.get('purchaseOrderItems') as UntypedFormArray;
    let purchaseOrderItems: PurchaseOrderItem[] = purchaseOrderItemsArray.getRawValue();
    this.totalBeforeDiscount = 0;
    this.grandTotal = 0;
    this.totalDiscount = 0;
    this.totalTax = 0;
    this.totalRoundOff = 0;
    if (purchaseOrderItems && purchaseOrderItems.length > 0) {
      purchaseOrderItems.forEach((po) => {
        if (po.unitPrice && po.returnquantity) {
          const totalBeforeDiscount =
            this.totalBeforeDiscount +
            parseFloat(this.quantitiesUnitPriceReturnPipe.transform(po.returnquantity, po.unitPrice, po.quantity));
          this.totalBeforeDiscount = parseFloat(totalBeforeDiscount.toFixed(2));
          const gradTotal = this.grandTotal + parseFloat(this.quantitiesUnitPriceReturnPipe.transform(
            po.returnquantity,
            po.unitPrice,
            po.discountPercentage,
            po.taxIds,
            this.taxsMap[0],
            po.discountType,
            po.quantity
          )
          );
          this.grandTotal = parseFloat(gradTotal.toFixed(2));
          const totalTax = this.totalTax + parseFloat(this.quantitiesUnitPriceTaxReturnPipe.transform(
            po.returnquantity,
            po.unitPrice,
            po.discountPercentage,
            po.taxIds,
            this.taxsMap[0],
            po.discountType,
            po.quantity
          )
          );
          this.totalTax = parseFloat(totalTax.toFixed(2));
          const totalDiscount = this.totalDiscount + parseFloat(this.quantitiesUnitPriceTaxReturnPipe.transform(
            po.returnquantity,
            po.unitPrice,
            po.discountPercentage,
            po.discountType,
            po.quantity
          )
          );
          this.totalDiscount = parseFloat(totalDiscount.toFixed(2));
        }
      });
      this.totalRoundOff = this.grandTotal - Math.floor(this.grandTotal);
      this.grandTotal = Math.floor(this.grandTotal);
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

  supplierNameForSearchChangeValue() {
    this.sub$.sink = this.purchaseOrderReturnForm
      .get('filerSupplier')
      ?.valueChanges.pipe(
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
          this.suppliersForSearch = resp;
        });
  }

  supplierNameChangeValue() {
    this.sub$.sink = this.purchaseOrderForm
      .get('filerSupplier')
      ?.valueChanges.pipe(
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
        this.suppliersForSearch = resp;
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
          this.translationService.getValue(
            'RETURN_PURCHASE_ORDER_CANT_BE_EDITED'
          )
        );
        return;
      }

      const purchaseOrder = this.buildPurchaseOrder();
      if (purchaseOrder.purchaseOrderItems.length == 0) {
        this.toastrService.error(
          this.translationService.getValue('PLEASE_SELECT_ITEM_RETURN')
        );
        return;
      }
      if (purchaseOrder.id) {
        this.purchaseOrderReturnStore.addUpdatePurchaseOrder(purchaseOrder);
      }
    }
  }

  redirectListPage() {
    toObservable(this.purchaseOrderReturnStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        this.purchaseOrderStore.loadPurchaseOrderFromReturn();
        this.router.navigate(['/purchase-order-return/list']);
      }
    });
  }

  getSubTotalAfterDiscount(discount: number, discountType: string, totalQuantity: number, returnQuantity: number) {
    if (discountType === 'fixed') {
      const unitDiscount = discount / totalQuantity;
      return parseFloat((unitDiscount * returnQuantity).toFixed(2));
    }
    return discount;
  }


  buildPurchaseOrder() {
    const purchaseOrder: PurchaseOrder = {
      id: this.purchaseOrder ? this.purchaseOrder.id : '',
      orderNumber: this.purchaseOrderForm.get('orderNumber')?.value,
      deliveryDate: this.purchaseOrderForm.get('deliveryDate')?.value,
      deliveryStatus: this.purchaseOrderForm.get('deliveryStatus')?.value,
      isPurchaseOrderRequest: false,
      poCreatedDate: this.purchaseOrderForm.get('poCreatedDate')?.value,
      purchaseOrderStatus: PurchaseOrderStatusEnum.Return,
      supplierId: this.purchaseOrderForm.get('supplierId')?.value,
      totalAmount: this.grandTotal,
      totalDiscount: this.totalDiscount,
      totalTax: this.totalTax,
      note: this.purchaseOrderForm.get('note')?.value,
      purchaseOrderItems: [],
      locationId: this.purchaseOrderForm.get('locationId')?.value,
      totalRoundOff: this.totalRoundOff,
      paymentMethod: this.purchaseOrderForm.get('paymentMethod')?.value,
      isSelectPaymentMethod: this.purchaseOrderForm.get('isSelectPaymentMethod')?.value,
      totalRefundAmount: 0,
    };
    const purchaseOrderItemsArray = this.purchaseOrderForm.get(
      'purchaseOrderItems'
    ) as UntypedFormArray;
    let purchaseOrderItems: PurchaseOrderItem[] = purchaseOrderItemsArray.getRawValue();
    purchaseOrderItems = purchaseOrderItems.filter((c) => (c.returnquantity ?? 0) > 0);
    if (purchaseOrderItems && purchaseOrderItems.length > 0) {
      purchaseOrderItems.forEach((po) => {
        const discount = this.getSubTotalAfterDiscount(
          po.discountPercentage,
          po.discountType ?? 'fixed',
          po.quantity ?? 1,
          po.returnquantity ?? 0
        );
        const discountPercentage = po.discountPercentage ?? 0;
        purchaseOrder.purchaseOrderItems.push({
          discount: parseFloat(
            this.quantitiesUnitPriceTaxReturnPipe.transform(
              po.returnquantity ?? 0,
              po.unitPrice,
              discountPercentage,
              po.discountType,
              po.quantity
            )
          ),
          discountType: po.discountType,
          productId: po.productId,
          unitId: po.unitId,
          quantity: po.returnquantity ?? 0,
          taxValue: parseFloat(this.quantitiesUnitPriceTaxReturnPipe.transform(
            po.returnquantity ?? 0,
            po.unitPrice,
            discountPercentage,
            po.taxIds,
            this.taxsMap[0],
            po.discountType,
            po.quantity
          )
          ),
          unitPrice: po.unitPrice,
          purchaseOrderItemTaxes: po.taxIds
            ? [
              ...po.taxIds.map((element) => {
                const purchaseOrderItemTaxes: PurchaseOrderItemTax = {
                  taxId: element,
                  taxValue: this.quantitiesUnitPriceTaxReturnPipe.transform(
                    po.returnquantity ?? 0,
                    po.unitPrice,
                    discountPercentage,
                    [element],
                    this.taxsMap[0],
                    po.discountType,
                    po.quantity
                  )
                };
                return purchaseOrderItemTaxes;
              }),
            ]
            : [],
          discountPercentage: discount,
        });
      });
    }
    return purchaseOrder;
  }
  cancel() {
    this.location.back();
  }
}
