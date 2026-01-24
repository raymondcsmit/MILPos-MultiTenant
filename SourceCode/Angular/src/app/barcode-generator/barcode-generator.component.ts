import { Component, inject, OnInit } from '@angular/core';
import { GenerateBarcodeComponent } from './generate-barcode/generate-barcode.component';
import { Product } from '@core/domain-classes/product';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslationService } from '@core/services/translation.service';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { debounceTime, distinctUntilChanged, switchMap, of, map, Observable, catchError } from 'rxjs';
import { ProductService } from '../product/product.service';
import { AsyncPipe } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { environment } from '@environments/environment';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BaseComponent } from '../base.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { BarcodeModel } from '@core/domain-classes/bar-code-generator';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-barcode-generator',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSelectModule,
    GenerateBarcodeComponent,
    PageHelpTextComponent,
    TranslateModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    AsyncPipe,
  ],
  providers: [TranslationService],
  templateUrl: './barcode-generator.component.html',
  styleUrl: './barcode-generator.component.scss'
})
export class BarcodeGeneratorComponent extends BaseComponent implements OnInit {
  productNameControl: FormControl = new FormControl();
  productList$: Observable<Product[]> = of([]);
  barcodeForm!: FormGroup;
  baseUrl = environment.apiUrl;
  barCodeData?: BarcodeModel;
  toastr = inject(ToastrService);

  public get productFormArray() {
    return this.barcodeForm.get('products') as FormArray;
  }

  constructor(private dialog: MatDialog,
    private productService: ProductService,
    private fb: FormBuilder
  ) {
    super();
    this.getLangDir();
  }
  ngOnInit(): void {
    this.productNameControlOnChange();
    this.createBarcodeForm();
  }

  generateBarcode() {
    if (this.productFormArray.length === 0) {
      this.toastr.error(this.translationService.getValue('PLEASE_SELECT_AT_LEAST_ONE_PRODUCT'));
      return;
    }
    this.barCodeData = this.barcodeForm.getRawValue();
    if (this.barCodeData) {
      this.barCodeData.noOfLabelsPerPage = this.barCodeData.noOfLabelsPerPage;
    }
  }

  createBarcodeForm(): void {
    this.barcodeForm = this.fb.group({
      isPrintProudctName: [true],
      isPrintPackagingDate: [true],
      isPrintPrice: [true],
      noOfLabelsPerPage: ['20'],
      products: this.fb.array([])
    })
  }

  productNameControlOnChange() {
    this.productList$ = this.productNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c: string) => {
        const productResource = new ProductResourceParameter();
        productResource.name = c;
        productResource.pageSize = 10;
        productResource.skip = 0;
        productResource.isBarcodeGenerated = true;
        return this.productService.getProductsDropdown(productResource);
      }),
      catchError(() => of([])) // prevent stream breaking on error
    );
  }

  onProductSelection(product: Product) {
    if (product.hasVariant) {
      let productResource = new ProductResourceParameter();
      productResource.parentId = product.id;
      productResource.pageSize = 10;
      productResource.isBarcodeGenerated = true;
      this.productService.getProductsDropdown(productResource).subscribe(
        (resp: Product[]) => {
          const products = [...resp];
          for (let index = 0; index < products.length; index++) {
            const productItem = products[index];
            const formGroup = this.fb.group({
              productId: [productItem.id],
              productName: [productItem.name],
              productUrl: [productItem.productUrl],
              noOfLabels: [1, [Validators.required, Validators.min(0)]],
              packageingDate: [this.CurrentDate],
              salesPrice: [productItem.salesPrice],
              barCode: [productItem.barcode]
            });
            this.productFormArray.push(formGroup);
          }
        });
    } else {
      const formGroup = this.fb.group({
        productId: [product.id],
        productName: [product.name],
        productUrl: [product.productUrl],
        noOfLabels: [1, [Validators.required, Validators.min(0)]],
        packageingDate: [this.CurrentDate],
        salesPrice: [product.salesPrice],
        barCode: [product.barcode]
      });
      this.productFormArray.push(formGroup);
    }
    this.productNameControl.setValue('');
  }

  onRemoveProduct(index: number) {
    this.productFormArray.removeAt(index);
  }
}
