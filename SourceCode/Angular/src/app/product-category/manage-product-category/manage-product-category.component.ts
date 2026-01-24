import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ProductCategory } from '@core/domain-classes/product-category';
import { ProductCategoryService } from '@core/services/product-category.service';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-manage-product-category',
  templateUrl: './manage-product-category.component.html',
  styleUrls: ['./manage-product-category.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatIconModule,
    ReactiveFormsModule,
    MatDialogModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule
  ]
})
export class ManageProductCategoryComponent
  extends BaseComponent
  implements OnInit {
  isEdit: boolean = false;
  categoryForm!: FormGroup;
  constructor(
    public dialogRef: MatDialogRef<ManageProductCategoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductCategory,
    private productCategoryService: ProductCategoryService,
    private toastrService: ToastrService,
    private fb: FormBuilder
  ) {
    super();
  }
  ngOnInit(): void {
    this.createCategoryForm();
    if (this.data.id) {
      this.isEdit = true;
      this.categoryForm.patchValue(this.data);
    }
    else {
      this.categoryForm.patchValue({ parentId: this.data.parentId });
    }
  }

  createCategoryForm() {
    this.categoryForm = this.fb.group({
      id: [''],
      name: ['', [Validators.required]],
      description: [''],
      parentId: ['']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    var categoryToSave: ProductCategory = this.categoryForm.getRawValue();
    if (categoryToSave && categoryToSave.id) {
      this.productCategoryService.update(categoryToSave.id, categoryToSave).subscribe((category) => {
        this.toastrService.success(this.translationService.getValue('PRODUCT_CATEGORY_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(category);
      });
    } else {
      this.productCategoryService.add(categoryToSave).subscribe((category) => {
        this.toastrService.success(this.translationService.getValue('PRODUCT_CATEGORY_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(category);
      });
    }
  }
}
