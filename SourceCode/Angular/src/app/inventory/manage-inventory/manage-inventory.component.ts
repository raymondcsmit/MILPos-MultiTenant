import { Component, Inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Inventory } from '@core/domain-classes/inventory';
import { Product } from '@core/domain-classes/product';
import {
  ProductResourceParameter,
  ProductType,
} from '@core/domain-classes/product-resource-parameter';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { ToastrService } from '@core/services/toastr.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { InventoryService } from '../inventory.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { BaseComponent } from '../../base.component';
import { ProductService } from '../../product/product.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Tax } from '@core/domain-classes/tax';
import { TaxService } from '@core/services/tax.service';
import { CustomCurrencyPipe } from "../../shared/pipes/custome-currency.pipe";
import { PaymentMethod } from '@core/domain-classes/payment-method';
import { PurchaseOrderPaymentService } from '../../purchase-order/purchase-order-payment.service';
import { PaymentMethodPipe } from "../../shared/pipes/payment-method.pipe";

@Component({
  selector: 'app-manage-inventory',
  templateUrl: './manage-inventory.component.html',
  styleUrls: ['./manage-inventory.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatDialogModule,
    ReactiveFormsModule,
    MatIconModule,
    TranslateModule,
    MatSelectModule,
    MatDividerModule,
    MatButtonModule,
    MatCardModule,
    CustomCurrencyPipe,
    PaymentMethodPipe
  ]
})
export class ManageInventoryComponent extends BaseComponent implements OnInit {
  inventoryForm!: UntypedFormGroup;
  products: Product[] = [];
  unitConversationlist: UnitConversation[] = [];
  unitConversationForproduct: UnitConversation[] = [];
  productResource: ProductResourceParameter;
  locations: BusinessLocation[] = [];
  taxes: Tax[] = [];
  paymentMethodslist: PaymentMethod[] = [];

  constructor(
    public dialogRef: MatDialogRef<ManageInventoryComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { inventory: Inventory; locations: BusinessLocation[], selectedLocation: string },
    private inventoryService: InventoryService,
    private toastrService: ToastrService,
    private unitConversationService: UnitConversationService,
    private fb: UntypedFormBuilder,
    private productService: ProductService,
    private taxService: TaxService,
    private purchaseOrderPaymentService: PurchaseOrderPaymentService
  ) {
    super();
    this.getLangDir();
    this.productResource = new ProductResourceParameter();
    this.productResource.productType = ProductType.VariantProduct;
    this.locations = data.locations;
  }

  ngOnInit(): void {
    this.getProducts();
    this.getUnitConversation();
    this.createForm();
    this.productNameChangeValue();
    this.paymentMethodsList();
    this.getTaxes();
    if (this.data?.inventory?.productId) {
      this.inventoryForm
        .get('filerProduct')
        ?.setValue(this.data?.inventory?.productName);
      this.inventoryForm
        .get('productId')
        ?.setValue(this.data?.inventory?.productId);
      this.inventoryForm.get('unitId')?.setValue(this.data?.inventory?.unitId);
    }

    if (this.data.selectedLocation) {
      this.inventoryForm.get('locationId')?.setValue(this.data.selectedLocation);
    }
  }

  createForm() {
    this.inventoryForm = this.fb.group({
      id: [''],
      currentStock: ['', [Validators.required, Validators.min(1)]],
      locationId: ['', [Validators.required]],
      filerProduct: [],
      productTaxes: [[]],
      productName: [''],
      productId: ['', [Validators.required]],
      unitId: ['', [Validators.required]],
      pricePerUnit: ['', [Validators.required, Validators.min(0)]],
      type: ['add'],
      taxIds: [[]],
      paymentMethod: [1, [Validators.required]], // Changed from 0 to 1 (CASH)
      referenceNumber: ['', [Validators.required]] 
    });
  }

  paymentMethodsList() {
    this.sub$.sink = this.purchaseOrderPaymentService.getPaymentMethod()
      .subscribe(f => this.paymentMethodslist = [...f]
      );
  }

  getTaxes() {
    this.taxService.getAll().subscribe((c) => (this.taxes = c));
  }

  getProducts() {
    this.productResource.name = '';
    this.productService.getProductsDropdown(this.productResource).subscribe((resp) => {
      if (resp) {
        this.products = [...resp];
      }
    });
  }

  getUnitConversation() {
    this.unitConversationService.getAll().subscribe((units) => {
      this.unitConversationlist = units;
    });
  }

  onSelectionChange(productId: any) {
    const product = this.products.find((c) => c.id === productId);
    this.unitConversationForproduct = this.unitConversationlist.filter((c) => c.id == (product?.unitId ?? ''));
  }

  productNameChangeValue() {
    this.sub$.sink = this.inventoryForm
      .get('filerProduct')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((c) => {
          this.productResource.name = c;
          return this.productService.getProductsDropdown(this.productResource);
        })
      )
      .subscribe((resp: Product[]) => {
        if (resp) {
          this.products = [...resp];
          if (this.data?.inventory?.id) {
            this.inventoryForm
              .get('productId')
              ?.setValue(this.data?.inventory?.productId);
            this.unitConversationForproduct = this.unitConversationlist.filter((c) => c.id == this.data?.inventory?.unitId);
            this.inventoryForm
              .get('unitId')
              ?.setValue(this.data?.inventory?.unitId);
          }
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private buildProductTaxes(productId: string, taxIds: string[]) {
    return taxIds.map(taxId => ({ taxId, productId }));
  }

  addInventory(): void {
    if (!this.inventoryForm.valid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }
    const inventory: Inventory = this.inventoryForm.getRawValue();
    const product = this.products.find((c) => c.id === inventory.productId);
    inventory.unitId = product ? product.unitId : '';
    inventory.currentStock = inventory.type == 'add' ? inventory.currentStock : -1 * inventory.currentStock;

    if (this.inventoryForm.get('type')?.value === 'add') {
      inventory.productTaxes = this.buildProductTaxes(
        inventory.productId ?? '',
        this.inventoryForm.get('taxIds')?.value ?? []
      );
    } else {
      inventory.productTaxes = [];
    }

    this.inventoryService.addInventory(inventory).subscribe(() => {
      this.toastrService.success(
        this.translationService.getValue('INVENTORY_SAVED_SUCCESSFULLY')
      );
      this.dialogRef.close(true);
    });
  }
}
