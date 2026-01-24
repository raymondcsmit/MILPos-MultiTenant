import { Component, OnInit } from '@angular/core';
import { DashboardStaticatics } from '@core/domain-classes/dashboard-staticatics';
import { DashboardService } from '../dashboard.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { dateCompare } from '@core/services/date-range';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatSelectModule,
    CustomCurrencyPipe,
    MatCardModule,
    MatIconModule,
    NgClass
  ]
})
export class StatisticsComponent extends BaseComponent implements OnInit {
  dashboardStaticatics: DashboardStaticatics;
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  constructor(private dashboardService: DashboardService,
    private fb: FormBuilder,
    private commonService: CommonService) {
    super();
    this.dashboardStaticatics = {
      totalPurchase: 0,
      totalSales: 0,
      totalSalesReturn: 0,
      totalPurchaseReturn: 0
    };
  }

  ngOnInit(): void {
    this.createForm()
    this.getBusinessLocations();
    this.onDateChange();
    this.getLangDir();
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations.length > 0) {
        this.searchForm.get('locationId')?.setValue(locationResponse.selectedLocation);
      }
      this.getDashboardStaticatics();
    });
  }

  onDateChange() {
    this.searchForm.get('fromDate')?.valueChanges.subscribe(() => {
      this.getDashboardStaticatics();
    });
    this.searchForm.get('toDate')?.valueChanges.subscribe(() => {
      this.getDashboardStaticatics();
    });
    this.searchForm.get('locationId')?.valueChanges.subscribe(() => {
      this.getDashboardStaticatics();
    });
  }

  createForm() {
    this.searchForm = this.fb.group({
      fromDate: [this.FromDate],
      toDate: [this.ToDate],
      locationId: ['']
    }, {
      validators: dateCompare(),
    });
  }



  getDashboardStaticatics() {
    if (this.searchForm.valid) {
      const fromDate = this.searchForm.get('fromDate')?.value;
      const toDate = this.searchForm.get('toDate')?.value;
      const locationId = this.searchForm.get('locationId')?.value;
      this.dashboardService.getDashboardStaticatics(fromDate, toDate, locationId)
        .subscribe((c: DashboardStaticatics) => {
          this.dashboardStaticatics = c;
        });
    }
  }
}
