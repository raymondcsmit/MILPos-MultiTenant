import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { Country } from '@core/domain-classes/country';
import { ManageCountryComponent } from '../manage-country/manage-country.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-country-list-presentation',
  templateUrl: './country-list-presentation.component.html',
  styleUrls: ['./country-list-presentation.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    HasClaimDirective,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    NgClass
  ]
})
export class CountryListPresentationComponent extends BaseComponent implements OnInit, OnChanges {
  @Input() countries: Country[] = [];
  @Output() deleteCountryHandler: EventEmitter<string> = new EventEmitter<string>();

  dataSource = new MatTableDataSource<Country>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['action', 'countryName'];
  footerToDisplayed = ['footer'];

  constructor(
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
    private toasterService: ToastrService,
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.dataSource.data.indexOf(row);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['countries'] && this.countries) {
      this.dataSource = new MatTableDataSource(this.countries); // Set new data
      this.dataSource.paginator = this.paginator; // Re-assign paginator
    }
  }

  deleteCountry(country: Country): void {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService.deleteConformationDialog(`${areU} :: ${country.countryName}`)
      .subscribe(isTrue => {
        if (isTrue) {
          this.deleteCountryHandler.emit(country.id);
        }
      });
  }

  manageCountry(country: Country | null): void {
    const dialogRef = this.dialog.open(ManageCountryComponent, {
      width: '350px',
      direction: this.langDir,
      data: Object.assign({}, country)
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const countryIndex = this.countries.findIndex(c => c.id === result.id);
        if (countryIndex > -1) {
          const updatedCountries = [...this.countries];
          updatedCountries[countryIndex] = result;
          this.countries = updatedCountries;
        } else {
          this.countries = [...this.countries, result];
        }
        this.dataSource = new MatTableDataSource(this.countries);
        this.dataSource.paginator = this.paginator;
      }
    });
  }
}
