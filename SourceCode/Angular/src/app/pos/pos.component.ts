import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormArray,
  UntypedFormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Customer } from '@core/domain-classes/customer';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';
import { Operators } from '@core/domain-classes/operator';
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
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { ClonerService } from '@core/services/clone.service';
import { environment } from '@environments/environment';
import { QuantitiesUnitPriceTaxPipe } from '@shared/pipes/quantities-unitprice-tax.pipe';
import { QuantitiesUnitPricePipe } from '@shared/pipes/quantities-unitprice.pipe';
import { ToastrService } from '@core/services/toastr.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { BaseComponent } from '../base.component';
import { CustomerService } from '../customer/customer.service';
import { ProductService } from '../product/product.service';
import { SalesOrderService } from '../sales-order/sales-order.service';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import {
  SalesDeliveryStatus,
  SalesDeliveryStatusEnum,
  salesDeliveryStatuses,
} from '@core/domain-classes/sales-delivery-statu';
import { CustomerDetailComponent } from '../customer/customer-detail/customer-detail.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PurchaseOrderPaymentService } from '../purchase-order/purchase-order-payment.service';
import { PaymentMethod } from '@core/domain-classes/payment-method';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { of } from 'rxjs';
import { ProductStockAlertDailogComponent } from '@shared/product-stock-alert-dailog/product-stock-alert-dailog.component';
import { ProductQuantityAlert } from '@core/domain-classes/product-quantity-alert';
import { SecurityService } from '@core/security/security.service';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentMethodPipe } from '@shared/pipes/payment-method.pipe';
import { ProductUnit } from '@core/domain-classes/product-unit';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SalesOrderInvoiceComponent } from '@shared/sales-order-invoice/sales-order-invoice.component';
import { BrandService } from '@core/services/brand.service';
import { Brand } from '@core/domain-classes/brand';
import { ProductCategory } from '@core/domain-classes/product-category';
import { ProductCategoryService } from '@core/services/product-category.service';
import { CategoryDrawer } from "./category-drawer/category-drawer";
import { BrandDrawer } from "./brand-drawer/brand-drawer";
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  viewProviders: [QuantitiesUnitPricePipe, QuantitiesUnitPriceTaxPipe],
  imports: [
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDividerModule,
    TranslateModule,
    CustomCurrencyPipe,
    PaymentMethodPipe,
    QuantitiesUnitPriceTaxPipe,
    HasClaimDirective,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    SalesOrderInvoiceComponent,
    CategoryDrawer,
    BrandDrawer,
    NgClass
  ],
})
export class PosComponent extends BaseComponent implements OnInit, AfterViewInit {
  salesOrderForm!: UntypedFormGroup;
  filterProducts: Product[] = [];
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
  salesOrder!: SalesOrder;
  salesOrderForInvoice!: SalesOrder;
  isEdit: boolean = false;
  baseUrl = environment.apiUrl;
  locations: BusinessLocation[] = [];
  salesDeliveryStatus: SalesDeliveryStatus[] = salesDeliveryStatuses;
  @ViewChild('filterValue') filterValue!: ElementRef;
  paymentMethodslist: PaymentMethod[] = [];
  isCategoryOpen = false;
  isBrandOpen = false;
  brands: Brand[] = [];
  categories: ProductCategory[] = [];
  selectedCategoryId: string = '';
  selectedBrandId: string = '';

  get salesOrderItemsArray(): UntypedFormArray {
    return <UntypedFormArray>this.salesOrderForm.get('salesOrderItems');
  }
  hasOnlyPOSPermission: boolean = false;
  taxes: Tax[] = [];

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
    private clonerService: ClonerService,
    private commonService: CommonService,
    private dialog: MatDialog,
    private purchaseOrderPaymentService: PurchaseOrderPaymentService,
    private securityService: SecurityService,
    private brandService: BrandService,
    private categoryService: ProductCategoryService
  ) {
    super();
    this.getLangDir();
    this.customerResource = new CustomerResourceParameter();
  }

  ngOnInit(): void {
    this.unitConversationlist = [...this.route.snapshot.data['units']];
    this.taxes = [...this.route.snapshot.data['taxs']];
    this.createSalesOrder();
    this.getProducts();
    this.getProductsByBarcode();
    this.customerNameChangeValue();
    this.getNewSalesOrderNumber();
    this.salesOrderForm.get('filterProductValue')?.setValue('');
    this.salesOrderForm.get('filterBarCodeValue')?.setValue('');
    this.getBusinessLocations();
    this.paymentMethodsList();
    this.resetAllTotal();
    this.checkPOSPermission();
    this.onFlatDiscountChange();
    this.getAllBarands();
    this.getAllCategories();
  }

  checkPOSPermission() {
    this.hasOnlyPOSPermission = this.securityService.isPOSPermissionOnly;
  }

  resetAllTotal() {
    this.totalBeforeDiscount = 0;
    this.grandTotal = 0;
    this.totalDiscount = 0;
    this.totalTax = 0;
  }

  paymentMethodsList() {
    this.sub$.sink = this.purchaseOrderPaymentService
      .getPaymentMethod()
      .subscribe((f) => (this.paymentMethodslist = [...f]));
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.salesOrderForm.patchValue({
          locationId: locationResponse.selectedLocation,
        });
      }
    });
  }

  getAllBarands() {
    this.brandService.getAll().subscribe((c: Brand[]) => {
      this.brands = c;
    });
  }

  getAllCategories() {
    this.categoryService.getAll(false).subscribe((c: ProductCategory[]) => {
      this.categories = c;
    });
  }

  ngAfterViewInit(): void {
    this.filterValue.nativeElement.focus();
  }

  createSalesOrder() {
    this.route.data.pipe().subscribe((salesOrderData: any) => {
      this.salesOrder = salesOrderData.salesorder;
      this.isEdit = false;
      this.getCustomers();
      this.salesOrderForm = this.fb.group({
        orderNumber: ['', [Validators.required]],
        filerCustomer: [''],
        deliveryDate: [this.CurrentDate, [Validators.required]],
        soCreatedDate: [this.CurrentDate, [Validators.required]],
        deliveryStatus: [SalesDeliveryStatusEnum.Delivered],
        paymentMethod: [1],
        referenceNumber: [''],
        customerId: ['', [Validators.required]],
          locationId: ['', [Validators.required]],
          salesPersonId: [''],
          note: [''],
        termAndCondition: [''],
        flatDiscount: [0],
        salesOrderItems: this.fb.array([]),
        filterProductValue: [''],
        filterBarCodeValue: [''],
      });
    });
  }

  setUnitConversationForProduct(id: string, index: number) {
    this.unitsMap[index] = this.unitConversationlist.filter((c) => c.id == id || c.parentId == id);
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

  onSelectionChange(unitId: any, index: number, isFromUI = true) {
    const productId = this.salesOrderItemsArray.controls[index]?.get('productId')?.value;
    const product = this.filterProducts.find((c) => c.id === productId);
    const unit = this.unitConversationlist.find((c) => c.id === unitId);
    let price = 0;

    if (unit && unit.value) {
      switch (unit.operator) {
        case Operators.Plush:
          price = (product?.salesPrice ?? 0) + parseFloat(unit.value);
          break;
        case Operators.Minus:
          price = product?.salesPrice ?? 0 - parseFloat(unit.value);
          break;
        case Operators.Multiply:
          price = product?.salesPrice ?? 0 * parseFloat(unit.value);
          break;
        case Operators.Divide:
          price = product?.salesPrice ?? 0 / parseFloat(unit.value);
          break;
      }
      this.salesOrderItemsArray.controls[index].patchValue({
        unitPrice: price,
      });
    } else {
      this.salesOrderItemsArray.controls[index].patchValue({
        unitPrice: product?.salesPrice,
      });
    }
  }

  onProductSelect(product: Product, isFromBarcodeScan = false) {
    let salesOrderItems: SalesOrderItem[] = this.salesOrderForm.get('salesOrderItems')?.value;

    const existingProductIndex = salesOrderItems.findIndex((c) => c.productId == product.id);
    let newIndex = existingProductIndex;
    if (existingProductIndex >= 0) {
      let iteamToUpdate = salesOrderItems[existingProductIndex];
      this.salesOrderItemsArray
        .at(existingProductIndex)
        ?.get('quantity')
        ?.patchValue(iteamToUpdate.quantity + 1);
    } else {
      newIndex = this.salesOrderItemsArray.length;
      this.salesOrderItemsArray.push(
        this.createSalesOrderItem(this.salesOrderItemsArray.length, product)
      );
    }

    this.setUnitConversationForProduct(product.unitId, newIndex);
    this.getAllTotal();
    this.playSound();

    if (isFromBarcodeScan) {
      this.filterValue.nativeElement.focus();
    }
  }

  createSalesOrderItem(index: number, product: Product) {
    const taxs = product.productTaxes?.map((c) => c.taxId);
    const percentage = product.productTaxes?.reduce((sum, prodTax) => sum + (prodTax?.tax?.percentage ?? 0), 0) ?? 0;
    const formGroup = this.fb.group({
      productId: [product.id],
      productName: [product.name],
      productUrl: [product.productUrl],
      salesPrice: [product.salesPrice],
      unitPrice: [product.salesPrice, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      taxValue: [taxs],
      taxPercentage: [percentage],
      unitId: [product.unitId, [Validators.required]],
      discountPercentage: [0, [Validators.min(0)]],
      discountType: ['fixed'],
      discount: [0],
      total: [0],
    });
    this.unitsMap[index] = this.unitConversationlist.filter(
      (c) => c.id == product.unitId || c.parentId == product.unitId
    );
    this.taxsMap[index] = [...this.route.snapshot.data['taxs']];
    return formGroup;
  }

  getProductsByBarcode() {
    this.sub$.sink = this.salesOrderForm
      .get('filterBarCodeValue')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          if (c) {
            const productResource = new ProductResourceParameter();
            productResource.barcode = c;
            productResource.name = '';
            productResource.pageSize = 0;
            productResource.skip = 0;
            return this.productService.getProductsDropdown(productResource);
          }
          return of([]);
        })
      )
      .subscribe((resp: Product[]) => {
        if (resp) {
          if (resp.length == 1) {
            const product: Product = resp[0];
            if (product.hasVariant) {
              const productResource = new ProductResourceParameter();
              productResource.pageSize = 0;
              productResource.parentId = product.id;
              this.productService
                .getProductsDropdown(productResource)
                .subscribe((resp: Product[]) => {
                  const products = resp.length > 0 ? [...resp] : [];
                  for (let index = 0; index < products.length; index++) {
                    this.onProductSelect(
                      this.clonerService.deepClone<Product>(products[index]),
                      true
                    );
                  }
                });
            } else {
              this.onProductSelect(this.clonerService.deepClone<Product>(product), true);
            }
            this.getAllTotal();
            this.toastrService.success(
              this.translationService.getValue('PRODUCT_ADDED_SUCCESSFULLY')
            );
          } else {
            if (this.salesOrderForm.get('filterBarCodeValue')?.value) {
              this.toastrService.warning(this.translationService.getValue('PRODUCT_NOT_FOUND'));
            }
          }
          this.salesOrderForm.get('filterBarCodeValue')?.patchValue('');
        }
      });
  }

  getProducts() {
    this.sub$.sink = this.salesOrderForm
      .get('filterProductValue')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          const productResource = new ProductResourceParameter();
          productResource.productType = ProductType.VariantProduct;
          productResource.name = c;
          productResource.barcode = '';
          productResource.pageSize = 0;
          productResource.skip = 0;
          return this.productService.getProductsDropdown(productResource);
        })
      )
      .subscribe((resp: Product[]) => {
        if (resp) {
          this.filterProducts = this.clonerService.deepClone<Product[]>(resp);
        }
      });
  }

  getAllTotal() {
    let salesOrderItems = this.salesOrderForm.get('salesOrderItems')?.value;
    this.totalBeforeDiscount = 0;
    this.grandTotal = 0;
    this.totalDiscount = 0;
    this.totalTax = 0;

    if (salesOrderItems && salesOrderItems.length > 0) {
      salesOrderItems.forEach((so: SalesOrderItem, index: number) => {
        if (so.unitPrice && so.quantity) {
          const totalBeforeDiscount =
            this.totalBeforeDiscount +
            parseFloat(this.quantitiesUnitPricePipe.transform(so.quantity, so.unitPrice));
          this.totalBeforeDiscount = parseFloat(totalBeforeDiscount.toFixed(2));
          let percentage = 0;

          if (this.taxes.length > 0 && so.taxIds && so.taxIds.length > 0) {
            const filteredTaxes = this.taxes.filter(tax => so.taxIds?.includes(tax.id));
            if (filteredTaxes && filteredTaxes.length > 0) {
              percentage = filteredTaxes.reduce((sum: number, prodTax: Tax) => sum + (prodTax?.percentage ?? 0), 0) ?? 0;
            }
          }

          const itemGradTotal = parseFloat(
            this.quantitiesUnitPricePipe.transform(
              so.quantity,
              so.unitPrice,
              so.discountPercentage,
              so.taxValue,
              this.taxes,
              so.discountType
            ));

          this.salesOrderItemsArray.controls[index].patchValue({
            total: itemGradTotal.toFixed(2),
            taxPercentage: percentage
          });

          const gradTotal =
            this.grandTotal +
            parseFloat(
              this.quantitiesUnitPricePipe.transform(
                so.quantity,
                so.unitPrice,
                so.discountPercentage,
                so.taxValue,
                this.taxes,
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
                so.taxValue,
                this.taxes,
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
    }

    const flatDiscount = this.salesOrderForm.get('flatDiscount')?.value || 0;
    this.totalDiscount = parseFloat((this.totalDiscount + flatDiscount).toFixed(2));

    this.grandTotal = parseFloat((this.grandTotal - flatDiscount).toFixed(2));

  }

  onUnitPriceChange() {
    this.getAllTotal();
  }

  onQuantityChange() {
    this.getAllTotal();
  }

  onFlatDiscountChange() {
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

  getCustomers() {
    if (this.salesOrder) {
      this.customerResource.id = this.salesOrder.customerId;
    } else {
      this.customerResource.customerName = '';
      this.customerResource.id = '';
    }
    this.customerService
      .getCustomersForDropDown(this.customerResource.customerName, this.customerResource.id, true)
      .subscribe((resp) => {
        this.customers = resp;
        const walkInCustomer = this.customers.find((c) => c.isWalkIn);
        if (!walkInCustomer && this.customers.length > 0) {
          this.salesOrderForm.get('customerId')?.setValue(this.customers[0].id);
        } else {
          this.salesOrderForm.get('customerId')?.setValue(walkInCustomer?.id);
        }
      });
  }

  onSaveAndNew() {
    this.onSalesOrderSubmit(true);
  }

  onSalesOrderSubmit(isSaveAndNew = false) {
    if (!this.salesOrderForm.valid) {
      this.salesOrderForm.markAllAsTouched();
    } else {
      const salesOrder = this.buildSalesOrder();
      salesOrder.isPOSScreenOrder = true;
      let salesOrderItems = this.salesOrderForm.get('salesOrderItems')?.value;
      if (salesOrderItems && salesOrderItems.length == 0) {
        this.toastrService.error(
          this.translationService.getValue('PLEASE_SELECT_ATLEASE_ONE_PRODUCT')
        );
      } else {
        const productUnits = salesOrder.salesOrderItems.map((c) => {
          return {
            productId: c.productId,
            unitId: c.unitId,
          } as ProductUnit;
        });
        this.productService
          .getProductsInventory(salesOrder.locationId, productUnits)
          .subscribe((resp: ProductQuantityAlert[]) => {
            const productsStock: ProductQuantityAlert[] = resp.map((c) => {
              const itemCount = salesOrder.salesOrderItems
                .filter((x) => x.productId === c.productId)
                .reduce((a, b) => a + b.quantity, 0);
              const salesOrderItem: SalesOrderItem | undefined = salesOrder.salesOrderItems.find(
                (x) => x.productId === c.productId
              );
              if (salesOrderItem) {
                const unitName = this.unitConversationlist.find(
                  (x) => x.id === salesOrderItem.unitId
                )?.name;
                return {
                  id: c.productId,
                  name: c.name,
                  stock: c.stock,
                  itemCount,
                  unitName: c.unitName,
                  selectedUnitName: unitName,
                  unitId: c.unitId,
                } as ProductQuantityAlert;
              }
              return {
                id: c.productId,
                name: c.name,
                stock: c.stock,
                itemCount,
                unitName: c.unitName,
                selectedUnitName: '',
                unitId: c.unitId,
              } as ProductQuantityAlert;
            });
            const outOffstockProducts = productsStock.filter((c) => c.stock < c.itemCount);
            if (outOffstockProducts.length > 0) {
              const dialogRef = this.dialog.open(ProductStockAlertDailogComponent, {
                data: outOffstockProducts,
                maxWidth: '50vw',
                maxHeight: '80vh',
              });
              dialogRef.afterClosed().subscribe((isProcessed: boolean) => {
                if (isProcessed) {
                  this.saveSalesOrder(salesOrder, isSaveAndNew);
                }
              });
            } else[this.saveSalesOrder(salesOrder, isSaveAndNew)];
          });
      }
    }
  }

  saveSalesOrder(salesOrder: SalesOrder, isSaveAndNew: boolean) {
    this.salesOrderService.addSalesOrder(salesOrder).subscribe({
      next: (orderResponse: SalesOrder) => {
        this.toastrService.success(
          this.translationService.getValue('SALES_ORDER_ADDED_SUCCESSFULLY')
        );
        if (orderResponse.id) {
          this.salesOrderService.getSalesOrderById(orderResponse.id).subscribe({
            next: (fullOrder: SalesOrder) => {
              this.salesOrderForInvoice = fullOrder;
              this.ngOnInit();
            },
            error: (err) => {
              console.error('Error fetching saved SalesOrder', err);
            },
          });
        }
      },
      error: (err) => {
        console.error('Error saving SalesOrder', err);
      },
    });
  }

  reloadCurrentRoute() {
    let currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  buildSalesOrder() {
    const salesOrder: SalesOrder = {
        id: this.salesOrder ? this.salesOrder.id : '',
        orderNumber: this.salesOrderForm.get('orderNumber')?.value,
        deliveryDate: this.salesOrderForm.get('deliveryDate')?.value,
        deliveryStatus: this.salesOrderForm.get('deliveryStatus')?.value,
        isSalesOrderRequest: false,
        soCreatedDate: this.salesOrderForm.get('soCreatedDate')?.value,
        salesOrderStatus: SalesOrderStatusEnum.Not_Return,
        customerId: this.salesOrderForm.get('customerId')?.value,
        locationId: this.salesOrderForm.get('locationId')?.value,
        salesPersonId: this.salesOrderForm.get('salesPersonId')?.value,
        totalAmount: this.grandTotal,
      totalDiscount: this.totalDiscount,
      totalTax: this.totalTax,
      flatDiscount: this.salesOrderForm.get('flatDiscount')?.value,
      note: this.salesOrderForm.get('note')?.value,
      paymentMethod: this.salesOrderForm.get('paymentMethod')?.value,
      referenceNumber: this.salesOrderForm.get('referenceNumber')?.value,
      termAndCondition: this.salesOrderForm.get('termAndCondition')?.value,
      salesOrderItems: [],
      totalRefundAmount: 0,
    };

    const salesOrderItems = this.salesOrderForm.get('salesOrderItems')?.value;
    if (salesOrderItems && salesOrderItems.length > 0) {
      salesOrderItems.forEach((so: any) => {
        salesOrder.salesOrderItems.push({
          discount: parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              so.quantity,
              so.unitPrice,
              so.discountPercentage,
              so.discountType
            )
          ),
          discountType: so.discountType,
          discountPercentage: so.discountPercentage,
          productId: so.productId,
          unitId: so.unitId,
          quantity: so.quantity,
          taxValue: parseFloat(
            this.quantitiesUnitPriceTaxPipe.transform(
              so.quantity,
              so.unitPrice,
              so.discountPercentage,
              so.taxValue,
              this.taxsMap[0],
              so.discountType
            )
          ),
          unitPrice: so.unitPrice,
          salesOrderItemTaxes: so.taxValue
            ? [
              ...so?.taxValue?.map((element: any) => {
                const salesOrderItemTaxes: SalesOrderItemTax = {
                  taxId: element,
                  taxValue: this.quantitiesUnitPriceTaxPipe.transform(
                    so.quantity,
                    so.unitPrice,
                    so.discountPercentage,
                    [element],
                    this.taxsMap[0],
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
    this.router.navigate(['/']);
  }

  addNewCustomer() {
    const dialogRef = this.dialog.open(CustomerDetailComponent, {
      data: Object.assign({}),
      maxWidth: '70vw',
      width: '100%',
      maxHeight: '90vh',
    });
    dialogRef.afterClosed().subscribe((customer?: Customer) => {
      if (customer) {
        this.customers.push(customer);
        this.salesOrderForm.get('customerId')?.patchValue(customer.id);
      }
    });
  }

  playSound() {
    const audio = new Audio();
    audio.src = 'sounds/success.mp3';
    audio.load();
    audio.play().catch((err) => console.warn('Sound play failed:', err));
  }

  toggleDrawer(value?: string) {
    if (value === 'CATEGORY') {
      this.isCategoryOpen = !this.isCategoryOpen;
    } else if (value === 'BRAND') {
      this.isBrandOpen = !this.isBrandOpen;
    } else {
      this.isCategoryOpen = false;
      this.isBrandOpen = false;
    }
  }

  onCategorySelected(categoryId: string) {
    this.selectedCategoryId = categoryId;
    const productResource = new ProductResourceParameter();
    productResource.pageSize = 0;
    productResource.skip = 0;
    productResource.productType = ProductType.VariantProduct;
    productResource.categoryId = categoryId || '';
    this.productService.getProductsDropdown(productResource).subscribe((products: Product[]) => {
      this.filterProducts = products ?? [];
    });
  }

  onBrandSelected(brandId: string) {
    this.selectedBrandId = brandId;
    const productResource = new ProductResourceParameter();
    productResource.pageSize = 0;
    productResource.skip = 0;
    productResource.brandId = brandId || '';
    productResource.productType = ProductType.VariantProduct;
    this.productService.getProductsDropdown(productResource).subscribe((products: Product[]) => {
      this.filterProducts = products ?? [];
    });
  }
}
