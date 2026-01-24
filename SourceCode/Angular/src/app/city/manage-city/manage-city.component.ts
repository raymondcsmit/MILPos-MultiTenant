import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { City } from '@core/domain-classes/city';
import { Country } from '@core/domain-classes/country';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { CityService } from '../city.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { DialogModule } from '@angular/cdk/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-city',
  templateUrl: './manage-city.component.html',
  styleUrls: ['./manage-city.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    DialogModule,
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
export class ManageCityComponent extends BaseComponent implements OnInit {

  isEdit: boolean = false;
  cityForm!: FormGroup;
  countryList: Country[] = [];
  filteredCountryList: Country[] = [];
  constructor(
    public dialogRef: MatDialogRef<ManageCityComponent>,
    @Inject(MAT_DIALOG_DATA) public data: City,
    private cityService: CityService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder,
    private commonService: CommonService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createForm();
    this.getCountries()
    if (this.data && this.data.id) {
      this.cityForm.patchValue(this.data);
      this.isEdit = true;
    }
  }

  createForm() {
    this.cityForm = this.fb.group({
      id: [''],
      cityName: ['', Validators.required],
      countryId: ['', Validators.required]
    });
  }

  getCountries() {
    this.sub$.sink = this.commonService.getCountry().subscribe(c => {
      this.countryList = c;
      this.filteredCountryList = c;
    });
  }

  filterName(name: string) {
    if (!name) {
      this.filteredCountryList = [...this.countryList];
      return;
    }
    this.filteredCountryList = this.countryList.filter(country => country.countryName.toLowerCase().includes(name.toLowerCase()));
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveCity(): void {
    if (!this.cityForm.valid) {
      this.cityForm.markAllAsTouched();
      return;
    }
    const city: City = this.cityForm.value;
    if (this.data.id) {
      this.cityService.updateCity(city.id, city).subscribe(() => {
        this.toastrService.success(this.translationService.getValue('CITY_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(city);
      });
    } else {
      this.cityService.saveCity(city).subscribe((c) => {
        this.toastrService.success(this.translationService.getValue('CITY_SAVED_SUCCESSFULLY'));
        this.dialogRef.close(city);
      });
    }
  }
}
