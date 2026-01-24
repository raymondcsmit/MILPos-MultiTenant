import { Component, OnInit } from '@angular/core';
import { CompanyProfile } from '@core/domain-classes/company-profile';
import { SecurityService } from '@core/security/security.service';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: []
})
export class FooterComponent extends BaseComponent implements OnInit {
  companyProfile!: CompanyProfile;
  currentYear!: number;
  constructor(private securityService: SecurityService) {
    super();
  }

  ngOnInit(): void {
    this.currentYear = this.CurrentDate.getFullYear();
    this.companyProfileSubscription();
  }

  companyProfileSubscription() {
    this.securityService.companyProfile.subscribe(profile => {
      if (profile) {
        this.companyProfile = profile;
      }
    });
  }

}
