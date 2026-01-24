import { Component, Inject, OnInit } from '@angular/core';
import {
  FormArray,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Variant } from '@core/domain-classes/variant';
import { VariantService } from '../variants.service';
import { ToastrService } from '@core/services/toastr.service';
import { VariantItem } from '@core/domain-classes/variant-item';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-variants',
  templateUrl: './manage-variants.component.html',
  styleUrls: ['./manage-variants.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatDialogModule,
    TranslateModule,
    ReactiveFormsModule,
    HasClaimDirective,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class ManageVariantsComponent extends BaseComponent implements OnInit {
  isEdit: boolean = false;
  variantForm!: UntypedFormGroup;
  variant!: Variant;

  get variantItemsArray(): FormArray {
    return <FormArray>this.variantForm.get('variantItems');
  }

  constructor(
    public dialogRef: MatDialogRef<ManageVariantsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Variant,
    private variantService: VariantService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder
  ) {
    super();
  }

  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.variantForm.patchValue(this.data);
      this.isEdit = true;
      this.pushVariantItemValueArray();
    } else {
      this.variantItemsArray.push(this.buildVariantItem());
    }
  }

  createForm() {
    this.variantForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      variantItems: this.fb.array([], [Validators.required]),
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveCariant(): void {
    if (!this.variantForm.valid) {
      this.variantForm.markAllAsTouched();
      return;
    }
    const variant: Variant = this.variantForm.value;

    variant.variantItems = variant.variantItems.filter((c) => c.name?.trim());

    if (variant.variantItems.length == 0) {
      this.toastrService.error(this.translationService.getValue('PLEASE_ADD_AT_LEASE_ONE_VARIANT'));
      return;
    }

    if (this.data.id) {
      this.variantService
        .updateVariant(variant.id ?? '', variant)
        .subscribe((newVariant) => {
          this.toastrService.success(this.translationService.getValue('VARIANT_SAVED_SUCCESSFULLY'));
          this.dialogRef.close(newVariant);
        });
    } else {
      this.variantService.saveVariant(variant).subscribe((newVariant) => {
        this.toastrService.success(this.translationService.getValue('VARIANT_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(newVariant);
      });
    }
  }

  onNameChange(event: any, index: number) {
    const email = this.variantItemsArray?.at(index)?.get('name')?.value;
    if (!email) {
      return;
    }
    const emailControl = this.variantItemsArray.at(index).get('name');
    emailControl?.setValidators([Validators.required]);
    emailControl?.updateValueAndValidity();
  }

  onAddAnotherName() {
    const variantItem: VariantItem = {
      id: '',
      variantId: this.variant && this.variant.id ? this.variant.id : '',
      name: '',
    };
    this.variantItemsArray.push(this.editVariantItem(variantItem));
  }

  editVariantItem(variantItem: VariantItem): FormGroup {
    return this.fb.group({
      id: [variantItem.id],
      variantId: [variantItem.variantId],
      name: [variantItem.name, Validators.required],
    });
  }

  pushVariantItemValueArray() {
    if (this.data.variantItems.length > 0) {
      this.data.variantItems.map((variantItem) => {
        this.variantItemsArray.push(this.editVariantItem(variantItem));
      });
    } else {
      this.variantItemsArray.push(this.buildVariantItem());
    }
  }

  onDeleteName(index: number) {
    this.variantItemsArray.removeAt(index);
  }

  buildVariantItem(): FormGroup {
    return this.fb.group({
      id: [''],
      variantId: [''],
      name: ['', Validators.required],
    });
  }
}
