import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { Currency } from '@core/domain-classes/currency';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { environment } from '@environments/environment';
import { BaseComponent } from '../base.component';
import { CompanyProfileService } from './company-profile.service';
import { MatDialogModule } from '@angular/material/dialog';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { ToastrService } from '@core/services/toastr.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-company-profile',
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    PageHelpTextComponent,
    TranslateModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    RouterModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule
  ]
})
export class CompanyProfileComponent extends BaseComponent implements OnInit {
  companyProfileForm!: UntypedFormGroup;
  imgSrc: string | ArrayBuffer = '';
  currencies: Currency[] = [];
  filteredCurrencies: Currency[] = [];
  constructor(private route: ActivatedRoute,
    private fb: UntypedFormBuilder,
    private companyProfileService: CompanyProfileService,
    private router: Router,
    private toastrService: ToastrService,
    private securityService: SecurityService,
    private commonService: CommonService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createform();
    this.getCurrencies();
    this.route.data.subscribe((data: any) => {
      this.companyProfileForm.patchValue(data.profile);
      if (data.profile.logoUrl) {
        this.imgSrc = environment.apiUrl + data.profile.logoUrl;
      }
    });
  }

  createform() {
    this.companyProfileForm = this.fb.group({
      id: [''],
      title: ['', [Validators.required]],
      address: ['', [Validators.required]],
      taxName: [''],
      taxNumber: [''],
      logoUrl: [''],
      imageData: [],
      phone: [''],
      email: ['', [Validators.email, Validators.required]],
      currencyCode: ['', [Validators.required]]
    });
  }


  getCurrencies() {
    this.commonService.getCurrencies().subscribe(data => {
      this.currencies = data;
      this.filteredCurrencies = data;
    });
  }

  filterName(name: string) {
    if (!name) {
      this.filteredCurrencies = [...this.currencies];
      return;
    }
    this.filteredCurrencies = this.currencies.filter(currency => currency.symbol.toLowerCase().includes(name.toLowerCase()) || currency.name.toLowerCase().includes(name.toLowerCase()));
  }

  saveCompanyProfile() {
    if (this.companyProfileForm.invalid) {
      this.companyProfileForm.markAllAsTouched();
      return
    }
    const companyProfile: CompanyProfile = this.companyProfileForm.getRawValue();
    this.companyProfileService.updateCompanyProfile(companyProfile)
      .subscribe((companyProfile: CompanyProfile) => {
        if (companyProfile.languages) {
          companyProfile.languages.forEach(lan => {
            lan.imageUrl = `${environment.apiUrl}${lan.imageUrl}`;
          })
        }
        this.securityService.updateProfile(companyProfile);
        this.toastrService.success(this.translationService.getValue('COMPANY_PROFILE_UPDATED_SUCCESSFULLY'));
        this.router.navigate(['dashboard']);
      });
  }

  onFileSelect($event: any) {
    const fileSelected: File = $event.target.files[0];
    if (!fileSelected) {
      return;
    }
    const mimeType = fileSelected.type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(fileSelected);
    reader.onload = (_event) => {
      this.imgSrc = reader.result ?? '';
      this.companyProfileForm.patchValue({
        imageData: reader?.result?.toString() ?? '',
        logoUrl: fileSelected.name
      })
      $event.target.value = '';
    }
  }
}
