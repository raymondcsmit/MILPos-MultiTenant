import { Component, OnInit } from '@angular/core';
import { IncomeComparison } from '@core/domain-classes/income-comparison';
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
  selector: 'app-income-comparison',
  templateUrl: './income-comparison.component.html',
  styleUrls: ['./income-comparison.component.scss'],
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
export class IncomeComparisonComponent extends BaseComponent implements OnInit {
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
      .getIncomeComparison(this.searchForm.get('locationId')?.value)
      .subscribe((data: IncomeComparison[]) => {
        this.isDataAvailable = data.length > 0;
        this.chartOptions = {
          ...this.chartOptions,
          series: [
            {
              name: 'Current Year',
              type: 'line',
              data: data.map((c) => c.currentYearIncome),
              smooth: true,
              itemStyle: { color: '#4caf50' }
            },
            {
              name: 'Last Year',
              type: 'line',
              data: data.map((c) => c.lastYearIncome),
              smooth: true,
              itemStyle: { color: '#f44336' }
            }
          ]
        };
      });
  }
}
