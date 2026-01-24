import { Component, OnInit } from '@angular/core';
import { SalesVsPurchase } from '@core/domain-classes/sales-purchase';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { SalesPurchaseReportService } from './sales-purchase-report.service';
import { CommonService } from '@core/services/common.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { dateCompare } from '@core/services/date-range';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';
import { BaseComponent } from '../../base.component';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-sales-purchase-report',
  templateUrl: './sales-purchase-report.component.html',
  styleUrls: ['./sales-purchase-report.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    NgxEchartsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
],
  providers: [
    UTCToLocalTime,
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: {
        echarts: () => import('echarts'),
      },
    }
  ]
})
export class SalesPurchaseReportComponent extends BaseComponent implements OnInit {
  searchForm!: FormGroup;
  echartsInstance = null;
  locations: BusinessLocation[] = [];
  lineChartColors: any[] = [
    {
      backgroundColor: '#2196f3',
    },
  ];

  constructor(
    private salesPurchaseReportService: SalesPurchaseReportService,
    private uTCToLocalTime: UTCToLocalTime,
    private commonService: CommonService,
    private fb: FormBuilder
  ) {
    super();
    this.getLangDir();
  }

  pieChartOptions = {
    color: ["#2196f3", "#86c5f9"],
    tooltip: {
      trigger: 'item'
    },
    legend: {
      data: ['Sales', 'Purchase']
    },
    xAxis: [
      {
        type: 'category',
        data: [] as string[]
      }
    ],
    yAxis: [
      {
        type: 'value'
      }
    ],
    series: [
      {
        name: 'Sales',
        type: 'bar',
        data: [
        ] as number[],

      },
      {
        name: 'Purchase',
        type: 'bar',
        data: [
        ] as number[],
      }
    ], emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  };

  ngOnInit(): void {
    this.createSearchFormGroup();
    this.getBusinessLocations();
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group(
      {
        fromDate: [this.FromDate],
        toDate: [this.ToDate],
        locationId: [''],
      },
      {
        validators: dateCompare(),
      }
    );
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.searchForm.get('locationId')?.setValue(locationResponse.selectedLocation);
      }
      this.getReportData();
    });
  }


  getReportData() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const fromDate = this.searchForm.get('fromDate')?.value;
    const toDate = this.searchForm.get('toDate')?.value;
    const locationId = this.searchForm.get('locationId')?.value;

    this.salesPurchaseReportService
      .getSalesVsPurchaseReport(fromDate, toDate, locationId)
      .subscribe((data: SalesVsPurchase[]) => {
        data = data.map((c) => {
          c.date = new Date(c.date);
          return c;
        });

        let finalData: SalesVsPurchase[] = [];
        for (let index = 0; index < data.length; index++) {
          const element = data[index];
          const exists = finalData.find((c) => c.date == element.date);
          if (exists) {
            exists.totalPurchase = exists.totalPurchase + element.totalPurchase;
            exists.totalSales = exists.totalSales + element.totalSales;
          } else {
            finalData.push(element);
          }
        }

        const totalSales = finalData.map((c) => c.totalSales);
        const totalPurchase = finalData.map((c) => c.totalPurchase);

        const labels = finalData.map((c) =>
          this.uTCToLocalTime.transform(c.date as Date, 'shortDate')
        );

        this.pieChartOptions = {
          ...this.pieChartOptions,
          xAxis: [
            {
              type: 'category',
              data: labels ?? []
            }
          ],
          yAxis: [
            {
              type: 'value'
            }
          ],
          series: [
            {
              name: 'Sales',
              type: 'bar',
              data: totalSales,
            },

            {
              name: 'Purchase',
              type: 'bar',
              data: totalPurchase,
            }
          ]
        };
      });

  }

  onClear() {
    this.searchForm.get('fromDate')?.setValue(this.FromDate);
    this.searchForm.get('toDate')?.setValue(this.ToDate);
    if (this.locations?.length > 0) {
      this.searchForm.get('locationId')?.setValue(this.locations[0].id);
    } else {
      this.searchForm.get('locationId')?.setValue('');
    }
    this.getReportData();
  }

  onChartInit(ec: any) {
    this.echartsInstance = ec;
  }
}
