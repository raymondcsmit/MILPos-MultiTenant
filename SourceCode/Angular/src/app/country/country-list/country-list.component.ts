import { Component, OnInit } from '@angular/core';
import { Country } from '@core/domain-classes/country';
import { CountryService } from '@core/services/country.service';
import { CountryListPresentationComponent } from '../country-list-presentation/country-list-presentation.component';
import { BaseComponent } from '../../base.component';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-country-list',
  templateUrl: './country-list.component.html',
  styleUrls: ['./country-list.component.scss'],
  standalone: true,
  imports: [
    CountryListPresentationComponent
  ]
})
export class CountryListComponent extends BaseComponent implements OnInit {
  countries: Country[] = [];
  constructor(
    private countryService: CountryService,
    private toastrService: ToastrService) {
    super();
  }

  ngOnInit(): void {
    this.getCountries();
  }

  getCountries() {
    this.countryService.getAll().subscribe(c => {
      this.countries = c;
    });
  }

  deleteCountry(id: string): void {
    this.sub$.sink = this.countryService.delete(id).subscribe(() => {
      this.toastrService.success(this.translationService.getValue('COUNTRY_DELETED_SUCCESSFULLY'));
      this.getCountries();
    });
  }
}
