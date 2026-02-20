import { Component, OnInit } from '@angular/core';
import { SalesComparison } from '@core/domain-classes/sales-comparison';
import { DashboardService } from '../dashboard.service';
import { EChartsCoreOption } from 'echarts/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sales-comparison',
  templateUrl: './sales-comparison.component.html',
  styleUrls: ['./sales-comparison.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatSelectModule,
    ReactiveFormsModule,
    NgxEchartsModule,
    MatCardModule,
    MatIconModule
  ],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: {
        echarts: () => import('echarts'),
      },
    }
  ]
})
export class SalesComparisonComponent extends BaseComponent implements OnInit {
  isDataAvailable = false;
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  chartOptions: EChartsCoreOption = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Current Year', 'Last Year']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    yAxis: {
      type: 'value'
    },
    series: []
  };

  constructor(
    private dashboardService: DashboardService,
    private fb: FormBuilder,
    private commonService: CommonService
  ) {
    super();
  }

  ngOnInit() {
    this.createForm();
    this.getBusinessLocations();
    this.onLocationChange();
  }

  createForm() {
    this.searchForm = this.fb.group({
      locationId: ''
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations.length > 0) {
        this.searchForm.get('locationId')?.setValue(locationResponse.selectedLocation);
      }
      this.getData();
    });
  }

  onLocationChange() {
    this.searchForm.get('locationId')?.valueChanges.subscribe(() => {
      this.getData();
    });
  }

  getData() {
    this.dashboardService
      .getSalesComparison(this.searchForm.get('locationId')?.value)
      .subscribe((data: SalesComparison[]) => {
        this.isDataAvailable = data.length > 0;
        this.chartOptions = {
          ...this.chartOptions,
          series: [
            {
              name: 'Current Year',
              type: 'line',
              data: data.map((c) => c.currentYearSales),
              smooth: true,
              itemStyle: { color: '#2196f3' }
            },
            {
              name: 'Last Year',
              type: 'line',
              data: data.map((c) => c.lastYearSales),
              smooth: true,
              itemStyle: { color: '#9c27b0' }
            }
          ]
        };
      });
  }
}
