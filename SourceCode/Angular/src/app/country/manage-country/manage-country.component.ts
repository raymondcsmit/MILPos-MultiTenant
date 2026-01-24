
import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Country } from '@core/domain-classes/country';
import { CountryService } from '@core/services/country.service';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-country',
  templateUrl: './manage-country.component.html',
  styleUrls: ['./manage-country.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatIconModule,
    HasClaimDirective,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatCardModule
  ]
})
export class ManageCountryComponent extends BaseComponent implements OnInit {

  isEdit: boolean = false;
  countryForm!: FormGroup;
  constructor(
    public dialogRef: MatDialogRef<ManageCountryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Country,
    private countryService: CountryService,
    private toastrService: ToastrService,
    private fb: FormBuilder) {
    super();
  }

  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.countryForm.patchValue(this.data);
      this.isEdit = true;
    }

  }

  createForm() {
    this.countryForm = this.fb.group({
      id: [''],
      countryName: ['', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveCountry(): void {
    if (!this.countryForm.valid) {
      this.countryForm.markAllAsTouched();
      return;
    }
    const country: Country = this.countryForm.value;
    if (this.data && this.data.id) {
      this.countryService.update(this.data.id, country).subscribe((res) => {
        this.toastrService.success(this.translationService.getValue('COUNTRY_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(res);
      });
    } else {
      this.countryService.add(country).subscribe((res) => {
        this.toastrService.success(this.translationService.getValue('COUNTRY_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(res);
      });
    }
  }
}
