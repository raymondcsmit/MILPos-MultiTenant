import { Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Tax } from '@core/domain-classes/tax';
import { TaxService } from '@core/services/tax.service';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-manage-tax',
  templateUrl: './manage-tax.component.html',
  styleUrls: ['./manage-tax.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatDialogModule,
    ReactiveFormsModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class ManageTaxComponent extends BaseComponent implements OnInit {
  isEdit: boolean = false;
  taxForm!: UntypedFormGroup;
  constructor(
    public dialogRef: MatDialogRef<ManageTaxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Tax,
    private taxService: TaxService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder) {
    super();

  }

  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.taxForm.patchValue(this.data);
      this.isEdit = true;
    }
  }

  createForm() {
    this.taxForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      percentage: ['', [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveTax(): void {
    if (!this.taxForm.valid) {
      this.taxForm.markAllAsTouched();
      return;
    }
    const tax: Tax = this.taxForm.value;

    if (this.data && this.data.id) {
      this.taxService.update(this.data.id, tax).subscribe((resp) => {
        this.toastrService.success(this.translationService.getValue('TAX_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(resp);
      });
    } else {
      this.taxService.add(tax).subscribe((resp) => {
        this.toastrService.success(this.translationService.getValue('TAX_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(resp);
      });
    }
  }

}
