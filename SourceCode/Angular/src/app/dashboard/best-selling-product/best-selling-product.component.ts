import { Component, OnInit } from '@angular/core';
import { BestSellingProudct } from '@core/domain-classes/bast-selling-product';
import { DashboardService } from '../dashboard.service';
import { EChartsCoreOption } from 'echarts/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-best-selling-product',
  templateUrl: './best-selling-product.component.html',
  styleUrls: ['./best-selling-product.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatDatepickerModule,
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
export class BestSellingProductComponent extends BaseComponent implements OnInit {
  echartsInstance = null;
  isDataAvailable = false;
  searchForm!: FormGroup;
  locations: BusinessLocation[] = [];
  barChartOptions: EChartsCoreOption = {
    color: ["#6777ef"],
    tooltip: {
      trigger: 'item'
    },
    xAxis: [
      {
        type: 'category',
      }
    ],
    yAxis: [
      {
        type: 'value'
      }
    ],
    series: [], emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  };

  constructor(
    private dashboardService: DashboardService,
    private fb: FormBuilder,
    private commonService: CommonService
  ) {
    super();
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations.length > 0) {
        this.searchForm.get('locationId')?.setValue(locationResponse.selectedLocation);
      }
      this.getBestSellingProducts();
    });
  }

  createForm() {
    this.searchForm = this.fb.group({
      fromDate: [this.FromDate],
      toDate: [this.ToDate],
      locationId: ''
    });
  }

  ngOnInit() {
    this.createForm();
    this.getBusinessLocations();
    this.onDateChange();
  }

  onDateChange() {
    this.searchForm.get('fromDate')?.valueChanges.subscribe(() => {
      this.getBestSellingProducts();
    });
    this.searchForm.get('toDate')?.valueChanges.subscribe(() => {
      this.getBestSellingProducts();
    });
    this.searchForm.get('locationId')?.valueChanges.subscribe(() => {
      this.getBestSellingProducts();
    });
  }

  getBestSellingProducts() {
    this.dashboardService
      .getBestSellingProducts(this.searchForm.get('fromDate')?.value, this.searchForm.get('toDate')?.value, this.searchForm.get('locationId')?.value)
      .subscribe((data: BestSellingProudct[]) => {
        this.isDataAvailable = data.length > 0;
        this.barChartOptions = {
          ...this.barChartOptions,
          xAxis: [
            {
              type: 'category',
              data: data.map((c) => c.name)
            }
          ],
          yAxis: [
            {
              type: 'value'
            }
          ],
          series: [
            {
              name: 'Product',
              type: 'bar',
              data: data.map((c) => c.count),
            }
          ]
        };
      });
  }
}
