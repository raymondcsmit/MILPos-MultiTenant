import { Component, inject } from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Customer } from '@core/domain-classes/customer';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';
import { Product } from '@core/domain-classes/product';
import {
  ProductResourceParameter,
  ProductType,
} from '@core/domain-classes/product-resource-parameter';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { SalesOrderItemTax } from '@core/domain-classes/sales-order-item-tax';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';
import { Tax } from '@core/domain-classes/tax';
import { CommonService } from '@core/services/common.service';
import { QuantitiesUnitPriceTaxPipe } from '@shared/pipes/quantities-unitprice-tax.pipe';
import { QuantitiesUnitPricePipe } from '@shared/pipes/quantities-unitprice.pipe';
import { ToastrService } from '@core/services/toastr.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { SalesOrderService } from '../sales-order.service';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { Operators } from '@core/domain-classes/operator';
import { BusinessLocation } from '@core/domain-classes/business-location';
import {
  SalesDeliveryStatus,
  SalesDeliveryStatusEnum,
  salesDeliveryStatuses,
} from '@core/domain-classes/sales-delivery-statu';
import { MatDialog } from '@angular/material/dialog';
import { ProductStockAlertDailogComponent } from '@shared/product-stock-alert-dailog/product-stock-alert-dailog.component';
import { ProductQuantityAlert } from '@core/domain-classes/product-quantity-alert';
import { environment } from '@environments/environment';
import { SalesOrderStore } from '../sales-order-store';
import { toObservable } from '@angular/core/rxjs-interop';
import { AddSalesOrderPaymentComponent } from '../add-sales-order-payment/add-sales-order-payment.component';
import { SalesOrderRequestConvertDailogComponent } from '../sales-order-request-convert-dailog/sales-order-request-convert-dailog.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { AsyncPipe } from '@angular/common';
import { BaseComponent } from '../../base.component';
import { CustomerDetailComponent } from '../../customer/customer-detail/customer-detail.component';
import { CustomerService } from '../../customer/customer.service';
import { ProductService } from '../../product/product.service';
import { ProductUnit } from '@core/domain-classes/product-unit';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { discountValidator } from '@shared/validators/discount-validator';
import { MatRadioModule } from '@angular/material/radio';


@Component({
  selector: 'app-sales-order-add-edit',
  templateUrl: './sales-order-add-edit.component.html',
  styleUrls: ['./sales-order-add-edit.component.scss'],
  viewProviders: [QuantitiesUnitPricePipe, QuantitiesUnitPriceTaxPipe],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    HasClaimDirective,
    MatDatepickerModule,
    MatSelectModule,
    MatDividerModule,
    MatAutocompleteModule,
    CustomCurrencyPipe,
    MatTimepickerModule,
    QuantitiesUnitPriceTaxPipe,
    QuantitiesUnitPricePipe,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    AsyncPipe,
    MatRadioModule
  ],
})
export class SalesOrderAddEditComponent extends BaseComponent {
  salesOrderForm!: UntypedFormGroup;
  customers: Customer[] = [];
  customerResource: CustomerResourceParameter;
  unitsMap: { [key: string]: UnitConversation[] } = {};
  unitConversationlist: UnitConversation[] = [];
  taxsMap: { [key: string]: Tax[] } = {};
  totalBeforeDiscount: number = 0;
  totalAfterDiscount: number = 0;
  totalDiscount: number = 0;
  grandTotal: number = 0;
  totalTax: number = 0;
  timeoutclear: any;
  salesOrder!: SalesOrder;
  locations: BusinessLocation[] = [];
  salesDeliveryStatus: SalesDeliveryStatus[] = salesDeliveryStatuses;
  productList$!: Observable<Product[]>;
  baseUrl = environment.apiUrl;
  barCodeNameControl: FormControl = new FormControl();
  productNameControl: FormControl = new FormControl();
  customerNameControl: FormControl = new FormControl();
  isEdit = false;
  salesOrderStore = inject(SalesOrderStore);
  taxs: Tax[] = [];
  totalRoundOff: number = 0;

  get salesOrderItemsArray(): UntypedFormArray {
    return <UntypedFormArray>this.salesOrderForm.get('salesOrderItems');
  }

  constructor(
    private fb: UntypedFormBuilder,
    private customerService: CustomerService,
    private toastrService: ToastrService,
    private salesOrderService: SalesOrderService,
    private router: Router,
    private productService: ProductService,
    private route: ActivatedRoute,
    private quantitiesUnitPricePipe: QuantitiesUnitPricePipe,
    private quantitiesUnitPriceTaxPipe: QuantitiesUnitPriceTaxPipe,
    private commonService: CommonService,
    private dialog: MatDialog
  ) {
    super();
    this.redirectListPage();
    this.getLangDir();
    this.customerResource = new CustomerResourceParameter();
  }

  ngOnInit(): void {
    this.unitConversationlist = [...this.route.snapshot.data['units']];
    this.taxs = [...this.route.snapshot.data['taxs']];

    this.createSalesOrder();
    this.customerNameChangeValue();
    this.getProductByBarCodeValue();
    this.productNameControlOnChange();
    this.onFaltDiscountChange();
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

  onProductSelection(product: Product) {
    if (product.hasVariant) {
      const productResource = new ProductResourceParameter();
      productResource.parentId = product.id;
      productResource.productType = ProductType.VariantProduct;
      this.productService.getProductsDropdown(productResource).subscribe((resp: Product[]) => {
        const products = [...resp];
        for (let index = 0; index < products.length; index++) {
          this.createSalesOrderItem(products[index]);
        }
        this.getAllTotal();
      });
    } else {
      this.createSalesOrderItem(product);
      this.getAllTotal();
    }
    this.productNameControl.setValue('');
  }

  patchSalesOrderItem(salesOrderItem: SalesOrderItem) {
    this.taxsMap[this.salesOrderItemsArray.length] = [...this.route.snapshot.data['taxs']];
    this.unitsMap[this.salesOrderItemsArray.length] = this.unitConversationlist.filter(
      (c) => c.id == salesOrderItem.product?.unitId || c.parentId == salesOrderItem.product?.unitId
    );
    const taxIds = salesOrderItem.salesOrderItemTaxes.map((c) => c.taxId);
    const percentage = salesOrderItem.salesOrderItemTaxes?.reduce((sum: number, prodTax: SalesOrderItemTax) => sum + (prodTax?.tax?.percentage ?? 0), 0) ?? 0;
    const formGroup = this.fb.group({
      productId: [salesOrderItem.productId, [Validators.required]],
      productName: [salesOrderItem.product?.name],
      productUrl: [salesOrderItem.product?.productUrl],
      salesPrice: [salesOrderItem.product?.salesPrice],
      unitPrice: [salesOrderItem.unitPrice, [Validators.required, Validators.min(0.1)]],
      purchasePrice: [salesOrderItem.product?.purchasePrice],
      quantity: [salesOrderItem.quantity, [Validators.required, Validators.min(1)]],
      taxIds: [taxIds],
      taxPercentage: [percentage],
      total: [0, [Validators.required]],
      unitId: [salesOrderItem.unitId, [Validators.required]],
      discount: [salesOrderItem.discount],
      discountType: [salesOrderItem.discountType],
      discountPercentage: [
        salesOrderItem.discountPercentage
      ],
    }, { validators: discountValidator });

    this.salesOrderItemsArray.push(formGroup);
  }

  createSalesOrderItem(product: Product) {
    let salesOrderItems: SalesOrderItem[] = this.salesOrderItemsArray.value;
    var existingProductIndex = salesOrderItems.findIndex((c) => c.productId == product.id);
    if (existingProductIndex >= 0) {
      let iteamToUpdate = salesOrderItems[existingProductIndex];
      this.salesOrderItemsArray
        .at(existingProductIndex)
        .get('quantity')
        ?.patchValue(iteamToUpdate.quantity + 1);
    } else {
      this.taxsMap[this.salesOrderItemsArray.length] = [...this.route.snapshot.data['taxs']];
      this.unitsMap[this.salesOrderItemsArray.length] = this.unitConversationlist.filter(
        (c) => c.id == product.unitId || c.parentId == product.unitId
      );

      const taxIds = product.productTaxes?.map((c) => c.taxId);
      const percentage = product.productTaxes?.reduce((sum, prodTax) => sum + (prodTax?.tax?.percentage ?? 0), 0) ?? 0;
      const formGroup = this.fb.group({
        productId: [product.id, [Validators.required]],
        productName: [product.name],
        productUrl: [product.productUrl],
        salesPrice: [product.salesPrice],
        unitPrice: [product.salesPrice, [Validators.required, Validators.min(0.1)]],
        purchasePrice: [product.purchasePrice],
        taxPercentage: [percentage],
        quantity: [1, [Validators.required, Validators.min(1)]],
        total: [0, [Validators.required]],
        taxIds: [taxIds],
        unitId: [product.unitId, [Validators.required]],
        discountPercentage: [0, [Validators.min(0)]],
        discount: [0],
        discountType: ['fixed']
      }, { validators: discountValidator });
      this.salesOrderItemsArray.push(formGroup);
    }
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0 && !this.salesOrder) {
        this.salesOrderForm.patchValue({
          locationId: locationResponse.selectedLocation,
        });
      }
    });
  }

  getSalesOrderRequestById(id: string) {
    this.salesOrderService.getSalesOrderById(id).subscribe((c: SalesOrder) => {
      if (c) {
        this.salesOrderForm.patchValue({
          filerSupplier: '',
          deliveryDate: c.deliveryDate,
          soCreatedDate: this.CurrentDate,
          customerId: c.customerId,
          note: c.note,
          termAndCondition: c.termAndCondition,
          locationId: c.locationId,
        });

        this.clearFormArray();

        c.salesOrderItems.forEach((item) => {
          this.patchSalesOrderItem(item);
        });

        this.customerResource.id = c.customerId;

        this.customerService
          .getCustomersForDropDown('', c.customerId)
          .subscribe((resp: Customer[]) => {
            this.customers = resp;
          });

        this.getAllTotal();
      }
    });
  }

  clearFormArray() {
    while (this.salesOrderItemsArray.length !== 0) {
      this.salesOrderItemsArray.removeAt(0);
    }
  }

  createSalesOrder() {
    this.route.data.pipe().subscribe((salesOrderData: any) => {
      this.salesOrder = salesOrderData.salesorder;
      if (this.salesOrder) {
        const soCreatedDate = new Date(this.salesOrder.soCreatedDate);
        this.isEdit = true;
        this.salesOrderForm = this.fb.group({
          orderNumber: [
            { value: this.salesOrder.orderNumber, disabled: true },
            [Validators.required],
          ],
          deliveryDate: [this.salesOrder.deliveryDate, [Validators.required]],
          soCreatedDate: [soCreatedDate, [Validators.required]],
          soCreatedTime: [soCreatedDate],
          deliveryStatus: [this.salesOrder.deliveryStatus],
          customerId: [this.salesOrder.customerId, [Validators.required]],
          locationId: [{ value: this.salesOrder.locationId, disabled: true }],
          note: [this.salesOrder.note],
          termAndCondition: [this.salesOrder.termAndCondition],
          flatDiscount: [this.salesOrder.flatDiscount],
          salesOrderItems: this.fb.array([]),
        });
        this.salesOrder.salesOrderItems.forEach((item) => {
          this.patchSalesOrderItem(item);
        });
        this.getCustomers();
        this.getAllTotal();
      } else {
        this.isEdit = false;
        this.getCustomers();
        this.salesOrderForm = this.fb.group({
          orderNumber: ['', [Validators.required]],
          deliveryDate: [this.CurrentDate, [Validators.required]],
          soCreatedDate: [this.CurrentDate, [Validators.required]],
          soCreatedTime: [new Date()],
          deliveryStatus: [SalesDeliveryStatusEnum.Pending],
          customerId: ['', [Validators.required]],
          locationId: ['', [Validators.required]],
          note: [''],
          flatDiscount: [0],
          termAndCondition: [''],
          salesOrderItems: this.fb.array([]),
        });
        this.getNewSalesOrderNumber();
        this.getSalesOrderRequest();
      }
      this.getBusinessLocations();
    });
  }

  getSalesOrderRequest() {
    this.sub$.sink = this.route.queryParamMap
      .pipe(map((params: ParamMap) => params.get('sales-order-requestId')))
      .subscribe((c) => {
        if (c) this.getSalesOrderRequestById(c);
      });
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
            if (this.salesOrderItemsArray.length == 1) {
              if (!this.salesOrderItemsArray.controls[0].get('productId')?.value) {
                this.onRemoveSalesOrderItem(0);
              }
            }
            const product: Product = resp[0];
            this.createSalesOrderItem(product);
            this.getAllTotal();
          } else {
            this.toastrService.warning(this.translationService.getValue('PRODUCT_NOT_FOUND'));
          }
          this.barCodeNameControl.setValue('');
        }
      });
  }

  getAllTotal() {
    let salesOrderItems: SalesOrderItem[] = this.salesOrderForm.get('salesOrderItems')?.value;
    this.totalBeforeDiscount = 0;
    this.grandTotal = 0;
    this.totalDiscount = 0;
    this.totalRoundOff = 0;
    this.totalTax = 0;
    if (salesOrderItems && salesOrderItems.length > 0) {
      salesOrderItems.forEach((so, index) => {
        if (so.unitPrice && so.quantity) {
          const totalBeforeDiscount =
            this.totalBeforeDiscount +
            parseFloat(this.quantitiesUnitPricePipe.transform(so.quantity, so.unitPrice));
          this.totalBeforeDiscount = parseFloat(totalBeforeDiscount.toFixed(2));
          let percentage = 0;
          if (this.taxs.length > 0 && so.taxIds && so.taxIds.length > 0) {
            const filteredTaxes = this.taxs.filter(tax => so.taxIds?.includes(tax.id));
            if (filteredTaxes && filteredTaxes.length > 0) {
              percentage = filteredTaxes.reduce((sum: number, prodTax: Tax) => sum + (prodTax?.percentage ?? 0), 0) ?? 0;
            }
          }
          const itemGradTotal = parseFloat(
            this.quantitiesUnitPricePipe.transform(
              so.quantity,
              so.unitPrice,
              so.discountPercentage,
              so.taxIds,
              this.taxs,
              so.discountType
            ));

          this.salesOrderItemsArray.controls[index].patchValue({
            total: Math.round(parseFloat(itemGradTotal.toFixed(2))),
            taxPercentage: percentage
          });

          const gradTotal =
            this.grandTotal +
            parseFloat(
              this.quantitiesUnitPricePipe.transform(
                so.quantity,
                so.unitPrice,
                so.discountPercentage,
                so.taxIds,
                this.taxs,
                so.discountType
              )
            );
          this.grandTotal = parseFloat(gradTotal.toFixed(2));

          const totalTax =
            this.totalTax +
            parseFloat(
              this.quantitiesUnitPriceTaxPipe.transform(
                so.quantity,
                so.unitPrice,
                so.discountPercentage,
                so.taxIds,
                this.taxs,
                so.discountType
              )
            );
          this.totalTax = parseFloat(totalTax.toFixed(2));
          const totalDiscount =
            this.totalDiscount +
            parseFloat(
              this.quantitiesUnitPriceTaxPipe.transform(
                so.quantity,
                so.unitPrice,
                so.discountPercentage,
                so.discountType
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

  onTotalChange(index: number) {
    const formGroup = this.salesOrderItemsArray.controls[index];
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

  onDiscountTypeChange(index: number) {
    const formGroup = this.salesOrderItemsArray.controls[index];
    const discountPercentage = parseFloat(formGroup.get('discountPercentage')?.value) || 0;
    if (discountPercentage > 0) {
      formGroup.get('discountPercentage')?.setValue(0);
      formGroup.get('discountPercentage')?.updateValueAndValidity();
      this.getAllTotal();
    }
  }

  onUnitPriceChange() {
    this.getAllTotal();
  }
  onQuantityChange() {
    this.getAllTotal();
  }
  onFaltDiscountChange() {
    this.salesOrderForm.get('flatDiscount')?.valueChanges.subscribe(c => {
      this.getAllTotal();
    })
  }
  onDiscountChange() {
    this.getAllTotal();
  }
  onTaxSelectionChange() {
    this.getAllTotal();
  }

  onRemoveSalesOrderItem(index: number) {
    this.salesOrderItemsArray.removeAt(index);
    this.getAllTotal();
  }

  setUnitConversationForProduct(id: string, index: number) {
    this.unitsMap[index] = this.unitConversationlist.filter((c) => c.id == id || c.parentId == id);
  }

  onUnitSelectionChange(unitId: any, index: number) {
    const salesPrice: number = this.salesOrderItemsArray.controls[index].get('salesPrice')?.value;
    const unit = this.unitConversationlist.find((c) => c.id === unitId);

    let price = 0;
    if (unit && unit.value) {
      switch (unit.operator) {
        case Operators.Plush:
          price = Math.round(salesPrice + parseFloat(unit.value));
          break;
        case Operators.Minus:
          price = Math.round(salesPrice - parseFloat(unit.value));
          break;
        case Operators.Multiply:
          price = Math.round(salesPrice * parseFloat(unit.value));
          break;
        case Operators.Divide:
          price = Math.round(salesPrice / parseFloat(unit.value));
          break;
      }
      this.salesOrderItemsArray.controls[index].patchValue({
        unitPrice: price,
      });
    } else {
      this.salesOrderItemsArray.controls[index].patchValue({
        unitPrice: salesPrice,
        unitId: unitId,
      });
    }

    this.getAllTotal();
  }

  getNewSalesOrderNumber() {
    this.salesOrderService.getNewSalesOrderNumber(false).subscribe((salesOrder) => {
      if (!this.salesOrder) {
        this.salesOrderForm.patchValue({
          orderNumber: salesOrder.orderNumber,
        });
      }
    });
  }

  customerNameChangeValue() {
    this.sub$.sink = this.customerNameControl.valueChanges
      .pipe(
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

  getCustomers() {
    if (this.salesOrder) {
      this.customerResource.id = this.salesOrder.customerId;
    } else {
      this.customerResource.customerName = '';
      this.customerResource.id = '';
    }
    this.customerService
      .getCustomersForDropDown(this.customerResource.customerName, this.customerResource.id)
      .subscribe((resp: Customer[]) => {
        this.customers = resp;
      });
  }

  onSalesOrderSubmit(isPay: boolean = false) {
    if (!this.salesOrderForm.valid) {
      this.salesOrderForm.markAllAsTouched();
      return;
    } else {
      if (
        this.salesOrder &&
        (this.salesOrder.salesOrderStatus === SalesOrderStatusEnum.Return ||
          this.salesOrder.deliveryStatus === SalesDeliveryStatusEnum.Delivered)
      ) {
        this.toastrService.error(
          this.translationService.getValue('RETURN_AND_DELIVERED_SALES_ORDER_CANT_BE_EDITED')
        );
        return;
      }
      const salesOrder = this.buildSalesOrder();
      salesOrder.isAllowPayment = isPay;

      if (salesOrder.salesOrderItems.length === 0) {
        this.toastrService.error(
          this.translationService.getValue('PLEASE_SELECT_ATLEASE_ONE_PRODUCT')
        );
        return;
      }

      const productUnits = salesOrder.salesOrderItems.map((c) => {
        return {
          productId: c.productId,
          unitId: c.unitId,
        } as ProductUnit;
      });

      this.productService
        .getProductsInventory(salesOrder.locationId, productUnits)
        .subscribe((resp: ProductQuantityAlert[]) => {
          const productsStock: any = resp.map((c) => {
            const itemCount = salesOrder.salesOrderItems
              .filter((x) => x.productId === c.productId)
              .reduce((a, b) => a + b.quantity, 0);
            const salesOrderItem: SalesOrderItem | null =
              salesOrder.salesOrderItems.find((x) => x.productId === c.productId) ?? null;
            let unitName;
            if (salesOrderItem) {
              unitName = this.unitConversationlist.find(
                (x) => x.id === salesOrderItem.unitId
              )?.name;
            }

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
          const outOffstockProducts = productsStock.filter((c: any) => c.stock < c.itemCount);
          if (outOffstockProducts.length > 0) {
            const dialogRef = this.dialog.open(ProductStockAlertDailogComponent, {
              data: outOffstockProducts,
              maxWidth: '50vw',
              maxHeight: '80vh',
            });
            dialogRef.afterClosed().subscribe((isProcessed: boolean) => {
              if (isProcessed) {
                this.saveSalesOrder(salesOrder);
              }
            });
          } else[this.saveSalesOrder(salesOrder)];
        });
    }
  }

  redirectListPage() {
    toObservable(this.salesOrderStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        if (this.salesOrderStore.isAllowPayment() && this.grandTotal != 0) {
          this.addPayment();
        } else {
          this.router.navigate(['/sales-order/list']);
        }
      }
    });
  }

  saveSalesOrder(salesOrder: SalesOrder) {
    this.salesOrderStore.addUpdateSalesOrder(salesOrder);
  }

  buildSalesOrder() {
    const soCreatedDate = this.salesOrderForm.get('soCreatedDate')?.value;
    const soCreatedTime = this.salesOrderForm.get('soCreatedTime')?.value;
    if (soCreatedTime) {
      //Set time into date
      soCreatedDate.setHours(soCreatedTime.getHours());
      soCreatedDate.setMinutes(soCreatedTime.getMinutes());
    } else {
      //Set current time into date
      soCreatedDate.setHours(new Date().getHours());
      soCreatedDate.setMinutes(new Date().getMinutes());
    }
    const salesOrder: SalesOrder = {
      id: this.salesOrder ? this.salesOrder.id : '',
      orderNumber: this.salesOrderForm.get('orderNumber')?.value,
      deliveryDate: this.salesOrderForm.get('deliveryDate')?.value,
      deliveryStatus: this.salesOrderForm.get('deliveryStatus')?.value,
      isSalesOrderRequest: false,
      soCreatedDate: soCreatedDate,
      salesOrderStatus: SalesOrderStatusEnum.Not_Return,
      customerId: this.salesOrderForm.get('customerId')?.value,
      locationId: this.salesOrderForm.get('locationId')?.value,
      totalAmount: this.grandTotal,
      totalDiscount: this.totalDiscount,
      totalRoundOff: this.totalRoundOff,
      totalTax: this.totalTax,
      note: this.salesOrderForm.get('note')?.value,
      flatDiscount: this.salesOrderForm.get('flatDiscount')?.value,
      termAndCondition: this.salesOrderForm.get('termAndCondition')?.value,
      salesOrderItems: [],
      totalRefundAmount: 0,
    };

    const salesOrderItems: SalesOrderItem[] = this.salesOrderForm.get('salesOrderItems')?.value;
    if (salesOrderItems && salesOrderItems.length > 0) {
      salesOrderItems.forEach((so, index) => {
        so.discountPercentage = so.discountPercentage ? so.discountPercentage : 0;
        salesOrder.salesOrderItems.push({
          discount: parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              so.quantity,
              so.unitPrice,
              so.discountPercentage,
              so.discountType
            )
          ),
          discountPercentage: so.discountPercentage,
          discountType: so.discountType,
          productId: so.productId,
          unitId: so.unitId,
          quantity: so.quantity,
          taxValue: parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              so.quantity,
              so.unitPrice,
              so.discountPercentage,
              so.taxIds,
              this.taxs,
              so.discountType
            )
          ),
          unitPrice: so.unitPrice,
          purchasePrice: so.purchasePrice,
          salesOrderItemTaxes: so.taxIds
            ? [
              ...so.taxIds.map((element) => {
                const salesOrderItemTaxes: SalesOrderItemTax = {
                  taxId: element,
                  taxValue: this.quantitiesUnitPriceTaxPipe.transform(
                    so.quantity,
                    so.unitPrice,
                    so.discountPercentage,
                    [element],
                    this.taxs,
                    so.discountType
                  ),
                };
                return salesOrderItemTaxes;
              }),
            ]
            : [],
        });
      });
    }
    return salesOrder;
  }

  onSalesOrderList() {
    this.router.navigate(['/sales-order/list']);
  }

  addNewCustomer() {
    const dialogRef = this.dialog.open(CustomerDetailComponent, {
      data: Object.assign({}),
      maxWidth: '70vw',
      maxHeight: '90vh',
      width: '100%',

      panelClass: 'customer-modalbox',
    });
    dialogRef.afterClosed().subscribe((customer?: Customer) => {
      if (customer) {
        this.customers.push(customer);
        this.salesOrderForm.get('customerId')?.patchValue(customer.id);
      }
    });
  }

  addPayment(): void {
    const dialogRef = this.dialog.open(AddSalesOrderPaymentComponent, {
      width: '60vw',
      data: Object.assign({}, this.salesOrderStore.currentItem()),
    });
    dialogRef.afterClosed().subscribe((isAdded: boolean) => {
      if (isAdded) {
        this.salesOrderStore.loadSalesOrderFromReturn();
      }
      this.salesOrderStore.resetIsAllowPayment();
      this.salesOrderStore.resetCurrentItem();
      this.router.navigate(['/sales-order/list']);
    });
  }

  convertFromSalesRequest() {
    const dialogRef = this.dialog.open(SalesOrderRequestConvertDailogComponent, {
      width: '400px',
    });
    dialogRef.afterClosed().subscribe((requestId: string) => {
      if (requestId) {
        this.getSalesOrderRequestById(requestId);
      }
    });
  }
}
