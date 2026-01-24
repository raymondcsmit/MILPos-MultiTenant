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
import { Customer } from '@core/domain-classes/customer';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SalesOrderItemTax } from '@core/domain-classes/sales-order-item-tax';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';
import { Tax } from '@core/domain-classes/tax';
import { Unit } from '@core/domain-classes/unit';
import { ToastrService } from '@core/services/toastr.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Location } from '@angular/common';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { environment } from '@environments/environment';
import { SalesOrderReturnStore } from '../sale-order-return-store';
import { toObservable } from '@angular/core/rxjs-interop';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../base.component';
import { SalesOrderStore } from '../../sales-order/sales-order-store';
import { CustomerService } from '../../customer/customer.service';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { QuantitiesUnitPriceTaxReturnPipe } from '@shared/pipes/quantities-unitprice-tax-return.pipe';
import { QuantitiesUnitPriceReturnPipe } from '@shared/pipes/quantities-unitprice-return.pipe';
import { MatRadioModule } from '@angular/material/radio';
import { QuantitiesUnitPriceDiscountReturnPipe } from '@shared/pipes/quantities-unitprice-discount-return.pipe';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { PaymentMethod, paymentMethods } from '@core/domain-classes/payment-method';

@Component({
  selector: 'app-sale-order-return',
  templateUrl: './sale-order-return.component.html',
  styleUrls: ['./sale-order-return.component.scss'],
  viewProviders: [
    QuantitiesUnitPriceReturnPipe,
    QuantitiesUnitPriceTaxReturnPipe,
    UTCToLocalTime],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatSelectModule,
    MatDividerModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    CustomCurrencyPipe,
    QuantitiesUnitPriceTaxReturnPipe,
    QuantitiesUnitPriceReturnPipe,
    HasClaimDirective,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatRadioModule,
    QuantitiesUnitPriceDiscountReturnPipe,
    PaymentMethodPipe
  ],
})
export class SaleOrderReturnComponent extends BaseComponent {
  salesOrderRetunStore = inject(SalesOrderReturnStore);
  salesOrderStore = inject(SalesOrderStore);
  salesOrderForm!: UntypedFormGroup;
  salesOrderReturnForm!: UntypedFormGroup;
  customersForSearch: Customer[] = [];
  customers: Customer[] = [];
  customerResource: CustomerResourceParameter;
  salesorders: SalesOrder[] = [];
  unitsMap: { [key: string]: Unit[] } = {};
  taxsMap: { [key: string]: Tax[] } = {};
  totalBeforeDiscount: number = 0;
  totalAfterDiscount: number = 0;
  totalDiscount: number = 0;
  grandTotal: number = 0;
  totalTax: number = 0;
  salesOrder!: SalesOrder;
  isEdit: boolean = false;
  salesOrderResource: SalesOrderResourceParameter;
  locations: BusinessLocation[] = [];
  baseUrl = environment.apiUrl;
  get salesOrderItemsArray(): UntypedFormArray {
    return <UntypedFormArray>this.salesOrderForm.get('salesOrderItems');
  }
  totalRoundOff: number = 0;
  paymentMethodslist: PaymentMethod[] = [];

  constructor(
    private fb: UntypedFormBuilder,
    private customerService: CustomerService,
    private toastrService: ToastrService,
    private salesOrderService: SalesOrderService,
    private router: Router,
    private route: ActivatedRoute,
    private quantitiesUnitPriceReturnPipe: QuantitiesUnitPriceReturnPipe,
    private quantitiesUnitPriceTaxReturnPipe: QuantitiesUnitPriceTaxReturnPipe,
    private location: Location,
    private commonService: CommonService,
    private uTCToLocalTime: UTCToLocalTime,
    private purchaseOrderPaymentService: PurchaseOrderPaymentService
  ) {
    super();
    this.getLangDir();
    this.redirectListPage();
    this.salesOrderResource = new SalesOrderResourceParameter();
    this.customerResource = new CustomerResourceParameter();
  }

  redirectListPage() {
    toObservable(this.salesOrderRetunStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        this.salesOrderStore.loadSalesOrderFromReturn();
        this.router.navigate(['/sales-order-return/list']);
      }
    });
  }

  ngOnInit(): void {
    this.paymentMethodsList();
    this.createSaleOrderForm();
    this.createSalesOrder();
    this.getBusinessLocations();
  }

  createSaleOrderForm() {
    this.salesOrderForm = this.fb.group({
      orderNumber: [{ value: '', disabled: true }],
      filerCustomer: [{ value: '', disabled: true }],
      deliveryDate: [{ value: null, disabled: true }],
      soCreatedDate: [{ value: null, disabled: true }],
      deliveryStatus: [{ value: null, disabled: true }],
      customerId: [{ value: null, disabled: true }],
      locationId: [{ value: null, disabled: true }],
      flatDiscount: [{ value: 0, disabled: true }],
      note: [{ value: '', disabled: false }],
      salesOrderItems: this.fb.array([]),
      isSelectPaymentMethod: [false],
      paymentMethod: [paymentMethods[0].id]
    });
  }

  paymentMethodsList() {
    this.sub$.sink = this.purchaseOrderPaymentService
      .getPaymentMethod()
      .subscribe((f) => (this.paymentMethodslist = [...f]));
  }

  createSalesOrderReturnOrder() {
    this.salesOrderReturnForm = this.fb.group({
      orderNumber: [''],
      filerCustomer: [''],
      customerId: [''],
      locationId: [''],
      salesOrderId: [''],
      filerSalesOrder: [''],
    });
    this.getCustomers();
    this.customerNameForSearchChangeValue();
    this.subscribeCustomerChangeEvent();
    this.subscribeSalesOrderFilterChangeEvent();
    this.onSalesOrderChange();
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
    });
  }

  subscribeCustomerChangeEvent() {
    this.salesOrderReturnForm
      .get('customerId')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          const salesResouce = new SalesOrderResourceParameter();
          salesResouce.customerId = c;
          // salesResouce.status = SalesOrderStatusEnum.Not_Return;
          return this.salesOrderService.getAllSalesOrder(salesResouce);
        })
      )
      .subscribe((resp: HttpResponse<SalesOrder[]>) => {
        if (resp && resp.body) {
          this.salesorders = [...resp.body];
        }
      });
  }

  subscribeSalesOrderFilterChangeEvent() {
    this.salesOrderReturnForm
      .get('filerSalesOrder')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          const salesResouce = new SalesOrderResourceParameter();
          salesResouce.orderNumber = c;
          return this.salesOrderService.getAllSalesOrder(salesResouce);
        })
      )
      .subscribe((resp: HttpResponse<SalesOrder[]>) => {
        if (resp && resp.body) {
          this.salesorders = [...resp.body];
        }
      });
  }

  onSalesOrderChange() {
    this.salesOrderReturnForm.get('salesOrderId')?.valueChanges.subscribe((id) => {
      if (id) {
        this.router.navigate(['/sales-order-return', id]);
      }
    });
  }

  createSalesOrder() {
    this.route.data.pipe().subscribe((salesOrderData: any) => {
      this.salesOrder = salesOrderData.salesorder;
      if (this.salesOrder) {
        this.salesOrderService.getSalesOrderByIdReturnItems(this.salesOrder.id ?? '')
          .subscribe((c: SalesOrderItem[]) => {
            this.salesOrder = { ...this.salesOrder, salesOrderItems: [...c] }
            const soCreatedDate = this.uTCToLocalTime.transform(this.salesOrder.soCreatedDate, 'short');
            this.isEdit = true;
            const paidAmount = Math.floor((this.salesOrder.totalPaidAmount ?? 0) - (this.salesOrder.totalRefundAmount ?? 0))
            this.salesOrderForm.patchValue({
              orderNumber: this.salesOrder.orderNumber,
              filerCustomer: '',
              deliveryDate: this.salesOrder.deliveryDate,
              soCreatedDate: soCreatedDate,
              deliveryStatus: this.salesOrder.deliveryStatus,
              customerId: this.salesOrder.customerId,
              locationId: this.salesOrder.locationId,
              flatDiscount: this.salesOrder.flatDiscount,
              note: '',
              isSelectPaymentMethod: paidAmount > 0 ? true : false
            });
            // this.salesOrderForm = this.fb.group({
            //   orderNumber: [{ value: this.salesOrder.orderNumber, disabled: true }],
            //   filerCustomer: [{ value: '', disabled: true }],
            //   deliveryDate: [{ value: this.salesOrder.deliveryDate, disabled: true }],
            //   soCreatedDate: [{ value: soCreatedDate, disabled: true }],
            //   deliveryStatus: [{ value: this.salesOrder.deliveryStatus, disabled: true }],
            //   customerId: [{ value: this.salesOrder.customerId, disabled: true }],
            //   locationId: [{ value: this.salesOrder.locationId, disabled: true }],
            //   flatDiscount: [{ value: this.salesOrder.flatDiscount, disabled: true }],
            //   note: [{ value: '', disabled: false }],
            //   salesOrderItems: this.fb.array([]),
            //   isSelectPaymentMethod: [paidAmount > 0 ? true : false],
            //   paymentMethod: [paymentMethods[0].id]
            // });
            c.forEach((item) => {
              this.patchSalesOrderItem(item);
            });
            this.customerNameChangeValue();
            this.getCustomers();
            this.getAllTotal();
          })
      } else {
        this.createSalesOrderReturnOrder();
        const salesResouce = new SalesOrderResourceParameter();
        salesResouce.pageSize = 10;
        salesResouce.status = SalesOrderStatusEnum.Not_Return;
        this.salesOrderService
          .getAllSalesOrder(salesResouce)
          .subscribe((resp: HttpResponse<SalesOrder[]>) => {
            if (resp && resp.body) {
              this.salesorders = [...resp.body];
            }
          });
      }
    });
  }

  patchSalesOrderItem(salesOrderItem: SalesOrderItem) {
    this.taxsMap[this.salesOrderItemsArray.length] = [...this.route.snapshot.data['taxs']];
    const units = [...this.route.snapshot.data['units']];
    this.unitsMap[this.salesOrderItemsArray.length] = [...units];
    const taxIds = salesOrderItem.salesOrderItemTaxes.map((c) => c.taxId);
    const maxQuantities = (salesOrderItem.quantity ?? 0) - (salesOrderItem.returnItemsQuantities ?? 0)
    console.log("Return Max Validation Quantities", maxQuantities);
    const formGroup = this.fb.group({
      productId: [salesOrderItem.productId, [Validators.required]],
      productName: [salesOrderItem.product?.name],
      productUrl: [salesOrderItem.product?.productUrl],
      salesPrice: [salesOrderItem.product?.salesPrice],
      unitPrice: [{ value: salesOrderItem.unitPrice, disabled: true }, [Validators.required]],
      quantity: [{ value: salesOrderItem.quantity, disabled: true }, [Validators.required]],
      returnquantity: [0, [Validators.required, Validators.max(maxQuantities)]],
      taxIds: [{ value: taxIds, disabled: true }],
      unitId: [{ value: salesOrderItem.unitId, disabled: true }, [Validators.required]],
      discountPercentage: [{ value: salesOrderItem.discountPercentage, disabled: true }],
      discountType: [{ value: salesOrderItem.discountType, disabled: true }],
      purchasePrice: [salesOrderItem.purchasePrice ?? 0],
      returnItemsQuantities: [salesOrderItem.returnItemsQuantities ?? 0]
    });

    this.salesOrderItemsArray.push(formGroup);
  }

  customerNameForSearchChangeValue() {
    this.sub$.sink = this.salesOrderReturnForm
      .get('filerCustomer')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.customerResource.customerName = c;
          this.customerResource.id = '';
          return this.customerService.getCustomersForDropDown(
            this.customerResource.customerName,
            this.customerResource.id
          );
        })
      )
      .subscribe((resp: Customer[]) => {
        this.customersForSearch = resp;
      });
  }

  customerNameChangeValue() {
    this.sub$.sink = this.salesOrderForm
      .get('filerCustomer')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.customerResource.customerName = c;
          this.customerResource.id = '';
          return this.customerService.getCustomersForDropDown(
            this.customerResource.customerName,
            this.customerResource.id
          );
        })
      )
      .subscribe((resp: Customer[]) => {
        this.customers = resp;
      });
  }

  getAllTotal() {
    let salesOrderItemsArray = this.salesOrderForm.get('salesOrderItems') as UntypedFormArray;
    let salesOrderItems = salesOrderItemsArray.getRawValue();

    this.totalBeforeDiscount = 0;
    this.grandTotal = 0;
    this.totalRoundOff = 0;
    this.totalDiscount = 0;
    this.totalTax = 0;

    if (salesOrderItems && salesOrderItems.length > 0) {
      salesOrderItems.forEach((so, index) => {
        so.discountPercentage = so.discountPercentage ?? 0;
        if (so.unitPrice && so.returnquantity) {
          const totalBeforeDiscount =
            this.totalBeforeDiscount +
            parseFloat(this.quantitiesUnitPriceReturnPipe.transform(so.returnquantity, so.unitPrice, so.quantities));
          this.totalBeforeDiscount = parseFloat(totalBeforeDiscount.toFixed(2));

          const gradTotal =
            this.grandTotal +
            parseFloat(
              this.quantitiesUnitPriceReturnPipe.transform(
                so.returnquantity,
                so.unitPrice,
                so.discountPercentage,
                so.taxIds,
                this.taxsMap[0],
                so.discountType,
                so.quantity
              )
            );
          this.grandTotal = parseFloat(gradTotal.toFixed(2));

          const totalTax =
            this.totalTax +
            parseFloat(
              this.quantitiesUnitPriceTaxReturnPipe.transform(
                so.returnquantity,
                so.unitPrice,
                so.discountPercentage,
                so.taxIds,
                this.taxsMap[0],
                so.discountType,
                so.quantity
              )
            );
          this.totalTax = parseFloat(totalTax.toFixed(2));

          const totalDiscount =
            this.totalDiscount +
            parseFloat(
              this.quantitiesUnitPriceTaxReturnPipe.transform(
                so.returnquantity,
                so.unitPrice,
                so.discountPercentage,
                so.discountType,
                so.quantity
              )
            );
          this.totalDiscount = parseFloat(totalDiscount.toFixed(2));
        }
      });

      this.totalRoundOff = this.grandTotal - Math.floor(this.grandTotal);
      this.grandTotal = Math.floor(this.grandTotal);
    }

    const flatDiscount = this.salesOrderForm.get('flatDiscount')?.value || 0;
    if (flatDiscount > 0) {
      this.totalDiscount = parseFloat((this.totalDiscount + flatDiscount).toFixed(2));
      this.grandTotal = parseFloat((this.grandTotal - flatDiscount).toFixed(2));

      this.totalRoundOff = this.grandTotal - Math.floor(this.grandTotal);
      this.grandTotal = Math.floor(this.grandTotal);
    }
  }


  onQuantityChange() {
    this.getAllTotal();
  }

  onFaltDiscountChange() {
    this.getAllTotal();
  }
  onRemoveSalesOrderItem(index: number) {
    this.salesOrderItemsArray.removeAt(index);
    this.getAllTotal();
  }

  getCustomers() {
    if (this.salesOrder) {
      this.customerResource.id = this.salesOrder.customerId;
    } else {
      this.customerResource.customerName = '';
      this.customerResource.id = '';
    }
    this.customerService
      .getCustomersForDropDown(this.customerResource.customerName, this.customerResource.id)
      .subscribe((resp) => {
        this.customers = resp;
        this.customersForSearch = resp;
      });
  }

  onSalesOrderSubmit() {
    if (!this.salesOrderForm.valid) {
      this.salesOrderForm.markAllAsTouched();
    } else {
      if (this.salesOrder && this.salesOrder.salesOrderStatus === SalesOrderStatusEnum.Return) {
        this.toastrService.error(
          this.translationService.getValue('RETURN_AND_DELIVERED_SALES_ORDER_CANT_BE_EDITED')
        );
        return;
      }
      const salesOrder = this.buildSalesOrder();
      if (salesOrder.salesOrderItems.length == 0) {
        this.toastrService.error(this.translationService.getValue('PLEASE_SELECT_ITEM_RETURN'));
        return;
      }
      if (salesOrder.id) {
        this.salesOrderRetunStore.addUpdateSalesOrderReturn(salesOrder);
      }
    }
  }

  buildSalesOrder() {
    const salesOrder: SalesOrder = {
      id: this.salesOrder ? this.salesOrder.id : '',
      orderNumber: this.salesOrderForm.get('orderNumber')?.value,
      deliveryDate: this.salesOrderForm.get('deliveryDate')?.value,
      deliveryStatus: this.salesOrderForm.get('deliveryStatus')?.value,
      isSalesOrderRequest: false,
      soCreatedDate: this.salesOrderForm.get('soCreatedDate')?.value,
      salesOrderStatus: SalesOrderStatusEnum.Return,
      customerId: this.salesOrderForm.get('customerId')?.value,
      locationId: this.salesOrderForm.get('locationId')?.value,
      flatDiscount: this.salesOrderForm.get('flatDiscount')?.value,
      totalAmount: this.grandTotal,
      totalDiscount: this.totalDiscount,
      totalTax: this.totalTax,
      note: this.salesOrderForm.get('note')?.value,
      salesOrderItems: [],
      totalRoundOff: this.totalRoundOff,
      paymentMethod: this.salesOrderForm.get('paymentMethod')?.value,
      isSelectPaymentMethod: this.salesOrderForm.get('isSelectPaymentMethod')?.value,
      totalRefundAmount: 0
    };
    const salesOrderItemsArray = this.salesOrderForm.get('salesOrderItems') as UntypedFormArray;
    let salesOrderItems: SalesOrderItem[] = salesOrderItemsArray.getRawValue();
    salesOrderItems = salesOrderItems.filter((c) => c.returnquantity ?? 0 > 0);
    if (salesOrderItems && salesOrderItems.length > 0) {
      salesOrderItems.forEach((so) => {
        const discount = this.getSubTotalAfterDiscount(
          so.discountPercentage,
          so.discountType ?? 'fixed',
          so.quantity ?? 1,
          so.returnquantity ?? 0
        );
        const discountPercentage = so.discountPercentage ?? 0;
        salesOrder.salesOrderItems.push({
          discount: parseFloat(
            this.quantitiesUnitPriceTaxReturnPipe.transform(
              so.returnquantity ?? 0,
              so.unitPrice,
              discountPercentage,
              so.discountType,
              so.quantity
            )
          ),
          discountType: so.discountType,
          productId: so.productId,
          unitId: so.unitId,
          quantity: so.returnquantity ?? 0,
          taxValue: parseFloat(
            this.quantitiesUnitPriceTaxReturnPipe.transform(
              so.returnquantity ?? 0,
              so.unitPrice,
              discountPercentage,
              so.taxIds,
              this.taxsMap[0],
              so.discountType,
              so.quantity
            )
          ),
          unitPrice: so.unitPrice,
          purchasePrice: so.purchasePrice,
          salesOrderItemTaxes: so.taxIds && so.taxIds.length > 0
            ? [
              ...so.taxIds.map((element) => {
                const salesOrderItemTaxes: SalesOrderItemTax = {
                  taxId: element,
                  taxValue: this.quantitiesUnitPriceTaxReturnPipe.transform(
                    so.returnquantity ?? 0,
                    so.unitPrice,
                    discountPercentage,
                    [element],
                    this.taxsMap[0],
                    so.discountType,
                    so.quantity
                  ),
                };
                return salesOrderItemTaxes;
              }),
            ]
            : [],
          discountPercentage: discount,
        });
      });
    }
    return salesOrder;
  }

  getSubTotalAfterDiscount(discount: number, discountType: string, totalQuantity: number, returnQuantity: number) {
    if (discountType === 'fixed') {
      const unitDiscount = discount / totalQuantity;
      return parseFloat((unitDiscount * returnQuantity).toFixed(2));
    }
    return discount;
  }

  cancel() {
    this.location.back();
  }
}
