import { Component, OnInit } from '@angular/core';
import { ProductSalesComparison } from '@core/domain-classes/product-sales-comparison';
import { DashboardService } from '../dashboard.service';
import { EChartsCoreOption } from 'echarts/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-sales-comparison',
  templateUrl: './product-sales-comparison.component.html',
  styleUrls: ['./product-sales-comparison.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
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
export class ProductSalesComparisonComponent extends BaseComponent implements OnInit {
  isDataAvailable = false;
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  barChartOptions: EChartsCoreOption = {
    color: ['#6777ef', '#ffa726'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
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
    xAxis: [
      {
        type: 'category',
        axisTick: { alignWithLabel: true }
      }
    ],
    yAxis: [
      {
        type: 'value'
      }
    ],
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
      .getProductSalesComparison(this.searchForm.get('locationId')?.value)
      .subscribe((data: ProductSalesComparison[]) => {
        this.isDataAvailable = data.length > 0;
        this.barChartOptions = {
          ...this.barChartOptions,
          xAxis: [
            {
              type: 'category',
              data: data.map((c) => c.productName)
            }
          ],
          series: [
            {
              name: 'Current Year',
              type: 'bar',
              data: data.map((c) => c.currentYearQuantity),
            },
            {
              name: 'Last Year',
              type: 'bar',
              data: data.map((c) => c.lastYearQuantity),
            }
          ]
        };
      });
  }
}
