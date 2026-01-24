import { HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryResourceParameter } from '@core/domain-classes/inventory-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { CommonService } from '@core/services/common.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../base.component';
import { InventoryDataSource } from '../../inventory/inventory-list/inventory-datasource';
import { InventoryService } from '../../inventory/inventory.service';
import { MatCardModule } from "@angular/material/card";
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-stock-report',
  templateUrl: './stock-report.component.html',
  styleUrls: ['./stock-report.component.scss'],
  providers: [CustomCurrencyPipe],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatMenuModule,
    MatSelectModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    TranslateModule,
    HasClaimDirective,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    NgClass
  ]
})
export class StockReportComponent extends BaseComponent implements OnInit {
  dataSource!: InventoryDataSource;
  displayedColumns: string[] = ['productName', 'stock'];
  columnsToDisplay: string[] = ["footer"];
  inventoryResource: InventoryResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _productNameFilter!: string;
  _locationFilter!: string;
  expandedElement: Inventory | null = null;
  locations: BusinessLocation[] = [];
  stocks: Inventory[] = [];

  public filterObservable$: Subject<string> = new Subject<string>();

  public get ProductNameFilter(): string {
    return this._productNameFilter;
  }

  public set ProductNameFilter(v: string) {
    this._productNameFilter = v;
    const nameFilter = `productName##${v}`;
    this.filterObservable$.next(nameFilter);
  }

  public get LocationFilter(): string {
    return this._locationFilter;
  }

  public set LocationFilter(v: string) {
    this._locationFilter = v;
    const locationfilter = `location##${v}`;
    this.filterObservable$.next(locationfilter);
  }

  constructor(
    private inventoryService: InventoryService,
    private cd: ChangeDetectorRef,
    private commonService: CommonService,
    private customCurrencyPipe: CustomCurrencyPipe,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.inventoryResource = new InventoryResourceParameter();
    this.inventoryResource.pageSize = 50;
    this.inventoryResource.orderBy = 'productName asc'
  }

  ngOnInit(): void {
    this.dataSource = new InventoryDataSource(this.inventoryService);
    this.getResourceParameter();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.inventoryResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('##');
        if (strArray[0] === 'productName') {
          this.inventoryResource.productName = escape(strArray[1]);
        }
        if (strArray[0] === 'location') {
          this.inventoryResource.locationId = strArray[1];
        }
        this.dataSource.loadData(this.inventoryResource);
      });
    this.getBusinessLocations();

    this.dataSource.connect().subscribe((data: Inventory[]) => {
      this.stocks = data;
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.LocationFilter = locationResponse.selectedLocation
      }
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.inventoryResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.inventoryResource.pageSize = this.paginator.pageSize;
          this.inventoryResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.inventoryResource);
        })
      )
      .subscribe();
  }


  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.inventoryResource.pageSize = c.pageSize;
          this.inventoryResource.skip = c.skip;
          this.inventoryResource.totalCount = c.totalCount;
        }
      });
  }

  toggleRow(element: Inventory) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }


  onDownloadReport(type: string) {
    if (!this.inventoryResource || this.inventoryResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    this.inventoryService.getInventoriesReport(this.inventoryResource)
      .subscribe((c: HttpResponse<Inventory[]>) => {
        if (c.body) {
          const inventories = [...c.body];
          let heading = [[
            this.translationService.getValue('PRODUCT_NAME'),
            this.translationService.getValue('STOCK'),
            this.translationService.getValue('AVERAGE_PURCHASE_PRICE'),
            this.translationService.getValue('AVERAGE_SALES_PRICE')
          ]];

          let inventoryReport: any = [];
          inventories.forEach((inventory: Inventory) => {
            inventoryReport.push([
              inventory.productName,
              `${inventory.currentStock} - ${inventory.unitName}`,
              this.customCurrencyPipe.transform(inventory.averagePurchasePrice),
              this.customCurrencyPipe.transform(inventory.averageSalesPrice)
            ]);
          });
          const title = this.translationService.getValue('STOCK_REPORT');
          if (type == 'csv' || type == 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(workBook, inventoryReport, { origin: "A2", skipHeader: true });
            XLSX.utils.book_append_sheet(workBook, workSheet, title);
            XLSX.writeFile(workBook, `${title}.${type}`);
          } else {
            const doc = new jsPDF();
            doc.setFontSize(16);
            const pageWidth = doc.internal.pageSize.getWidth();
            const titleWidth = doc.getTextWidth(title);
            const titleX = (pageWidth - titleWidth) / 2;
            doc.text(title, titleX, 10);
            doc.setFontSize(10);
            const locationName = this.locations.find(x => x.id == this.inventoryResource.locationId)?.name;
            let y = 15;
            doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
            y = y + 5;
            autoTable(doc, {
              head: heading,
              body: inventoryReport,
              startY: y
            });
            if (type === 'pdf') {
              doc.save(`${title}.pdf`);
            }
            else {
              const base64String = doc.output('datauristring').split(',')[1];
              const dialogRef = this.dialog.open(SendEmailComponent, {
                data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title}` }),
                minWidth: '40vw',
              });
              dialogRef.afterClosed().subscribe(() => {
              });
            }
          }
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.stocks.indexOf(row);
  }
}

