import { Component, inject, OnInit } from '@angular/core';
import {
  FormArray,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Brand } from '@core/domain-classes/brand';
import { Product } from '@core/domain-classes/product';
import { ProductCategory } from '@core/domain-classes/product-category';
import { Tax } from '@core/domain-classes/tax';
import { Unit } from '@core/domain-classes/unit';
import { BrandService } from '@core/services/brand.service';
import { ProductCategoryService } from '@core/services/product-category.service';
import { TaxService } from '@core/services/tax.service';
import { environment } from '@environments/environment';
import { ToastrService } from '@core/services/toastr.service';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { Variant } from '@core/domain-classes/variant';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { UnitConversation } from '@core/domain-classes/unit-conversation';
import { VariantItem } from '@core/domain-classes/variant-item';
import { ProductStore } from '../product-store';
import { toObservable } from '@angular/core/rxjs-interop';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { VariantService } from '../../variants/variants.service';
import { ProductTax } from '@core/domain-classes/product-tax';
import { ManageProductCategoryComponent } from '../../product-category/manage-product-category/manage-product-category.component';
import { ManageUnitConversationComponent } from '../../unit-conversation/manage-unit-conversation/manage-unit-conversation.component';
import { ManageBrandComponent } from '../../brand/manage-brand/manage-brand.component';
import { ManageVariantsComponent } from '../../variants/manage-variants/manage-variants.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { NgStyle } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manage-product',
  templateUrl: './manage-product.component.html',
  styleUrls: ['./manage-product.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatCheckboxModule,
    RouterModule,
    HasClaimDirective,
    CustomCurrencyPipe,
    NgStyle,
    MatButtonModule,
    MatIconModule
  ]
})
export class ManageProductComponent extends BaseComponent implements OnInit {
  productForm!: UntypedFormGroup;
  units: Unit[] = [];
  productCategories: ProductCategory[] = [];
  allCategories: ProductCategory[] = [];
  taxes: Tax[] = [];
  brands: Brand[] = [];
  variants: Variant[] = [];
  productImgSrc: any = null;
  isProductImageUpload = false;
  variantItems: VariantItem[] = [];
  selectedVariantItems: string[] = [];
  copySelectedVariantItems: string[] = [];
  productStore = inject(ProductStore)
  isAddUpdate = this.productStore.isAddUpdate;
  constructor(
    private fb: UntypedFormBuilder,
    private unitConversationService: UnitConversationService,
    private productCategoryService: ProductCategoryService,
    private taxService: TaxService,
    private brandService: BrandService,
    private toastrService: ToastrService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private variantService: VariantService,
    private dialog: MatDialog

  ) {
    super();
    this.redirectListPage();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createProductForm();
    this.getUnits();
    this.getProductCategories();
    this.getTaxes();
    this.getBrands();
    this.getVariants();
    this.activatedRoute.data.subscribe((data: any) => {
      if (data && data.product) {
        this.productForm.patchValue(data.product);
        if (data.product.productUrl) {
          this.productImgSrc = `${environment.apiUrl}${data.product.productUrl}`;
        }
        const productTaxIds = data.product.productTaxes.map((c: ProductTax) => c.taxId);
        this.productForm.get('productTaxIds')?.patchValue(productTaxIds);
        if (data.product.productVariants) {
          data.product.productVariants.forEach((item: Product) => {
            item.productTaxIds = productTaxIds;
            item.productTaxes = data.product.productTaxes;
            this.addVariant(item);
            this.selectedVariantItems.push(item.variantItemId ?? '');
          });
        }
        this.productForm.get('hasVariant')?.disable();
        this.productForm.get('variantId')?.disable();
        this.copySelectedVariantItems = [...this.selectedVariantItems];
      }
    });
    this.subScribeMarginChange(this.productForm);

    this.productForm.get('productTaxIds')?.valueChanges.subscribe(() => {
      this.updateVariantTaxes();
    });
  }

  createProductForm() {
    this.productForm = this.fb.group({
      id: [''],
      name: ['', [Validators.required]],
      brandId: ['', [Validators.required]],
      code: [''],
      barcode: [''],
      skuCode: [''],
      skuName: [''],
      description: [''],
      productTaxIds: [],
      productUrlData: [],
      qRCodeUrlData: [''],
      unitId: ['', [Validators.required]],
      purchasePrice: [, [Validators.required, Validators.min(0.1)]],
      salesPrice: [],
      mrp: [],
      categoryId: ['', [Validators.required]],
      hasVariant: [false],
      variantId: [''],
      productVariants: this.fb.array([]),
      alertQuantity: [],
      margin: [],
      isMarginIncludeTax: [false],
    });
  }

  updateVariantTaxes() {
    const taxIds = this.productForm.get('productTaxIds')?.value;

    this.variantsArray.controls.forEach((variant) => {
      variant.patchValue({
        productTaxIds: taxIds,
      });
    });
  }

  getUnits() {
    this.unitConversationService.getAll().subscribe((units) => {
      this.units = units.filter((c) => !c.parentId);
    });
  }

  getProductCategories() {
    this.productCategoryService.getAll(true).subscribe((c) => {
      this.productCategories = [...c];
      this.setDeafLevel();
    });
  }

  subScribeMarginChange(formGroup: UntypedFormGroup) {
    formGroup.get('margin')?.valueChanges.subscribe((c) => {
      this.calculateSalesPrice(formGroup);
    });

    formGroup.get('purchasePrice')?.valueChanges.subscribe((c) => {
      this.calculateSalesPrice(formGroup);
    });

    // formGroup.get('isMarginIncludeTax')?.valueChanges.subscribe((c) => {
    //   this.calculateSalesPrice(formGroup);
    // });

    formGroup.get('productTaxIds')?.valueChanges.subscribe((c) => {
      this.calculateSalesPrice(formGroup);
    });
  }

  calculateSalesPrice(formGroup: UntypedFormGroup) {
    const margin: number = formGroup.get('margin')?.value ?? 0;
    let basePurchasePrice: number = formGroup.get('purchasePrice')?.value ?? 0;

    let salesPrice = basePurchasePrice + (basePurchasePrice * margin) / 100;
    formGroup.get('salesPrice')?.setValue(salesPrice.toFixed(2));
  }

  setDeafLevel(parent?: ProductCategory, parentId?: string) {
    const children = this.productCategories.filter(
      (c) => c.parentId == parentId
    );
    if (children.length > 0) {
      children.map((c, index) => {
        const object: ProductCategory = Object.assign({}, c, {
          deafLevel: parent ? (parent.deafLevel ?? 0) + 1 : 0,
          index:
            (parent ? (parent.index ?? 0) : 0) + index * Math.pow(0.1, (c.deafLevel ?? 0)),
        });
        this.allCategories.push(object);
        this.setDeafLevel(object, object.id);
      });
    }
    return parent;
  }

  getTaxes() {
    this.taxService.getAll().subscribe((c) => (this.taxes = c));
  }

  getBrands() {
    this.brandService.getAll().subscribe((b) => (this.brands = b));
  }

  getVariants() {
    this.variantService.getVariants().subscribe((variants) => {
      this.variants = variants;
      const variantId = this.productForm.get('variantId')?.value;
      if (variantId) {
        this.variantItems = this.variants.find(
          (c) => c.id == variantId
        )?.variantItems ?? [];
      }
    });
  }
  redirectListPage() {
    toObservable(this.productStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        this.router.navigate(['/products']);
      }
    });
  }

  removeVariant(index: number) {
    const item: Product = this.variantsArray.at(index).value;
    this.selectedVariantItems = this.selectedVariantItems.filter(
      (c) => c != item.variantItemId
    );
    this.variantsArray.removeAt(index);
  }

  onProductSubmit() {
    if (!this.productForm.valid) {
      this.productForm.markAllAsTouched();
      return;
    }
    let product: Product = this.productForm.getRawValue();
    if (product.hasVariant && this.selectedVariantItems.length == 0) {
      this.toastrService.error(this.translationService.getValue('SELECT_ATLEASE_ONE_VARIANT'));
      return;
    }
    const taxIds: string[] = this.productForm.get('productTaxIds')?.value;
    if (taxIds) {
      product.productTaxes = taxIds.map((c) => {
        return {
          taxId: c,
          productId: product.id,
        };
      });
    }
    product.isProductImageUpload = this.isProductImageUpload;
    product.productUrlData = this.productImgSrc;
    if (product.hasVariant) {
      for (let index = 0; index < (product?.productVariants?.length ?? 0); index++) {
        let variant = product && product?.productVariants && product?.productVariants[index] ? product?.productVariants[index] : null;
        if (variant && variant.productTaxIds) {
          variant.productTaxes = variant.productTaxIds?.map((c) => {
            return {
              taxId: c,
              productId: product.id,
            };
          });
        }
      }
    }
    this.productStore.addUpdateProduct(product);
  }

  onProductImageSelect($event: any) {
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
      this.productImgSrc = reader.result;
      this.isProductImageUpload = true;
      $event.target.value = '';
    };
  }

  onProductImageRemove() {
    this.isProductImageUpload = true;
    this.productImgSrc = '';
  }

  onVariantChange(variantId: string) {
    while (this.variantsArray.length !== 0) {
      this.variantsArray.removeAt(0);
    }
    const variant = this.variants.find((c) => c.id == variantId);
    this.variantItems = [];
    this.selectedVariantItems = [];
    if (variant && variant.variantItems.length > 0) {
      this.variantItems.push(...variant.variantItems);
      const selectedIds = variant.variantItems.map((c) => c.id ?? '');
      if (selectedIds && selectedIds.length > 0) {
        this.selectedVariantItems.push(...selectedIds);
      }

    }

    const productName = this.productForm.get('name')?.value;

    const taxIds: string[] = this.productForm.get('productTaxIds')?.value;
    for (let index = 0; index < (variant?.variantItems.length ?? 0); index++) {
      const item = variant?.variantItems[index];
      const variantGroup = this.addVariant({
        id: '',
        name: productName ? `${productName}-${item?.name ?? ''}` : item?.name ?? '',
        categoryId: this.productForm.get('categoryId')?.value,
        unitId: this.productForm.get('unitId')?.value,
        productTaxIds: taxIds,
        variantId: variant?.id,
        variantItemId: item?.id,
        barcode: this.productForm.get('barcode')?.value,
        salesPrice: this.productForm.get('salesPrice')?.value,
        purchasePrice: this.productForm.get('purchasePrice')?.value,
        mrp: this.productForm.get('mrp')?.value,
        margin: this.productForm.get('margin')?.value,
        isMarginIncludeTax: this.productForm.get('isMarginIncludeTax')?.value,
        alertQuantity: this.productForm.get('alertQuantity')?.value,
      });

      this.calculateSalesPrice(variantGroup as unknown as UntypedFormGroup);
    }
  }

  onItemChange() {
    const items: Product[] = this.variantsArray.value;
    const productName = this.productForm.get('name')?.value;
    for (let index = 0; index < this.selectedVariantItems.length; index++) {
      const item = this.selectedVariantItems[index];
      const isExists = items.find((c) => c.variantItemId == item);
      if (!isExists) {
        const itemToAdd = this.variantItems.find((c) => c.id == item);
        const taxIds: string[] = this.productForm.get('productTaxIds')?.value;
        if (itemToAdd) {
          this.addVariant({
            id: '',
            name: productName ? `${productName}-${itemToAdd.name}` : itemToAdd.name,
            categoryId: this.productForm.get('categoryId')?.value,
            unitId: this.productForm.get('unitId')?.value,
            productTaxIds: taxIds,
            variantId: itemToAdd.variantId,
            variantItemId: item,
            salesPrice: this.productForm.get('salesPrice')?.value,
            barcode: this.productForm.get('barcode')?.value,
            purchasePrice: this.productForm.get('purchasePrice')?.value,
            mrp: this.productForm.get('mrp')?.value,
            margin: this.productForm.get('margin')?.value,
            isMarginIncludeTax: this.productForm.get('isMarginIncludeTax')?.value,
            alertQuantity: this.productForm.get('alertQuantity')?.value,
          });
        }
      }
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const isExists = this.selectedVariantItems.find(
        (c) => c == item.variantItemId
      );
      if (!isExists) {
        this.variantsArray.removeAt(index);
      }
    }
  }

  get variantsArray() {
    return this.productForm.get('productVariants') as FormArray;
  }

  addVariant(data: Product): UntypedFormGroup {
    const variantGroup = this.fb.group({
      id: [data.id],
      name: [data.name, [Validators.required]],
      categoryId: [data.categoryId],
      unitId: [data.unitId],
      productTaxIds: [data.productTaxIds],
      variantId: [data.variantId],
      variantItemId: [data.variantItemId],
      barcode: [data.barcode],
      salesPrice: [data.salesPrice],
      purchasePrice: [data.purchasePrice, [Validators.required, Validators.min(0.1)]],
      mrp: [data.mrp],
      margin: [data.margin],
      isMarginIncludeTax: [data.isMarginIncludeTax],
      alertQuantity: [data.alertQuantity],
      taxAmount: [data.taxAmount]
    });

    this.variantsArray.push(variantGroup);
    this.subScribeMarginChange(variantGroup);

    return variantGroup;
  }

  onHasVariantChange(event: MatCheckboxChange) {
    if (!event.checked) {
      this.productForm.get('variantId')?.setValue('');
      while (this.variantsArray.length !== 0) {
        this.variantsArray.removeAt(0);
      }
    }
  }

  addNewCategory() {
    const dialogRef = this.dialog.open(ManageProductCategoryComponent, {
      width: '370px',
      direction: this.langDir,
      data: {},
    });

    dialogRef.afterClosed().subscribe((result: ProductCategory) => {
      if (result) {
        this.allCategories.unshift(result);
        this.productForm.get('categoryId')?.patchValue(result.id);
      }
    });
  }

  addNewUnit() {
    const dialogRef = this.dialog.open(ManageUnitConversationComponent, {
      width: '80vh',
      direction: this.langDir,
      data: {
        unitdata: {},
        units: this.units,
      },
    });

    dialogRef.afterClosed().subscribe((result: UnitConversation) => {
      if (result && !result.parentId) {
        this.units = [...this.units, result];
        this.productForm.get('unitId')?.patchValue(result.id);
      } else {
        this.productForm.get('unitId')?.patchValue(result.parentId);
      }
    });
  }

  addNewBrand() {
    const dialogRef = this.dialog.open(ManageBrandComponent, {
      width: '110vh',
      direction: this.langDir,
      data: {},
    });

    dialogRef.afterClosed().subscribe((result: Brand) => {
      if (result) {
        this.brands = [result, ...this.brands];
        this.productForm.get('brandId')?.patchValue(result.id);
      }
    });
  }

  addNewVariant() {
    let dialogRef = this.dialog.open(ManageVariantsComponent, {
      width: '350px',
      direction: this.langDir,
      data: {},
    });
    dialogRef.afterClosed().subscribe((data: Variant) => {
      if (data) {
        this.variants.unshift(data);
        this.productForm.get('variantId')?.patchValue(data.id);
        this.onVariantChange(data.id ?? '');
      }
    });
  }
}
