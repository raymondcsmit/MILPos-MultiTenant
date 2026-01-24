import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Brand } from '@core/domain-classes/brand';
import { BrandService } from '@core/services/brand.service';
import { ToastrService } from '@core/services/toastr.service';
import { environment } from '@environments/environment';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-brand',
  templateUrl: './manage-brand.component.html',
  styleUrls: ['./manage-brand.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    PageHelpTextComponent,
    MatDialogModule,
    TranslateModule,
    ReactiveFormsModule,
    MatIconModule,
    HasClaimDirective,
    MatButtonModule,
    MatCardModule,
  ],
})
export class ManageBrandComponent extends BaseComponent implements OnInit {
  isEdit: boolean = false;
  brandForm!: FormGroup;
  imgSrc: any = null;
  isImageUpload: boolean = false;
  isDragOver: boolean = false;
  constructor(
    public dialogRef: MatDialogRef<ManageBrandComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Brand,
    private brandService: BrandService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createForm();
    if (this.data && this.data.id) {
      this.brandForm.patchValue(this.data);
      this.isEdit = true;
      if (this.data.imageUrl) {
        this.imgSrc = `${environment.apiUrl}${this.data.imageUrl}`;
      }
    } else {
      this.imgSrc = '';
    }
  }

  createForm() {
    this.brandForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
    });
  }

  onFileSelect($event: any) {
    const fileSelected = $event.target.files[0];
    if (!fileSelected) {
      return;
    }
    this.processImageFile(fileSelected);
    $event.target.value = '';
  }

  onDragOver($event: DragEvent) {
    $event.preventDefault();
    $event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave($event: DragEvent) {
    $event.preventDefault();
    $event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop($event: DragEvent) {
    $event.preventDefault();
    $event.stopPropagation();
    this.isDragOver = false;

    const files = $event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.processImageFile(file);
    }
  }

  private processImageFile(file: File) {
    const mimeType = file.type;
    if (mimeType.match(/image\/*/) == null) {
      this.toastrService.error('Please select a valid image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toastrService.error('File size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (_event) => {
      this.imgSrc = reader.result;
      this.isImageUpload = true;
    };
  }

  onRemoveImage() {
    this.isImageUpload = true;
    this.imgSrc = '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveBrand(): void {
    if (!this.brandForm.valid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    const brand: Brand = this.brandForm.value;
    brand.imageUrlData = this.imgSrc;
    brand.isImageChanged = this.isImageUpload;

    if (this.data.id) {
      this.brandService.update(this.data.id ?? '', brand).subscribe((newBrand: Brand) => {
        this.toastrService.success(this.translationService.getValue('BRAND_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(newBrand);
      });
    } else {
      this.brandService.add(brand).subscribe((newBrand) => {
        this.toastrService.success(this.translationService.getValue('BRAND_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(newBrand);
      });
    }
  }
}
