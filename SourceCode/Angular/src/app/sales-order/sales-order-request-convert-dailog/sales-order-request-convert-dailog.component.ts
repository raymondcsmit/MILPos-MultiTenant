import { Component } from '@angular/core';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { SalesOrderService } from '../sales-order.service';
import { HttpResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-sales-order-request-convert-dailog',
  templateUrl: './sales-order-request-convert-dailog.component.html',
  styleUrl: './sales-order-request-convert-dailog.component.scss',
  standalone: true,
  imports: [
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    TranslateModule,
    MatSelectModule,
    MatDividerModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class SalesOrderRequestConvertDailogComponent extends BaseComponent {
  salesOrderRequestList: SalesOrder[] = [];
  searchForm: FormGroup;
  constructor(private salesOrderService: SalesOrderService,
    private dialogRef: MatDialogRef<SalesOrderRequestConvertDailogComponent>,
    private fb: FormBuilder
  ) {
    super();
    this.getLangDir();
    this.searchForm = this.fb.group({
      salesOrderRequestOrderNumber: [''],
      salesOrderRequestId: ['', [Validators.required]]
    });
    this.getSalesOrderRequestChange();
    this.getSalesOrderRequestList();
  }

  onCancel() {
    this.dialogRef.close();
  }

  getSalesOrderRequestChange() {
    this.searchForm.get('salesOrderRequestOrderNumber')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((c) => {
        this.getSalesOrderRequestList(c);
      });
  }

  getSalesOrderRequestList(orderNumber?: string) {
    const salesOrderResource = new SalesOrderResourceParameter();
    salesOrderResource.orderNumber = orderNumber;
    salesOrderResource.pageSize = 5;
    salesOrderResource.orderBy = 'sOCreatedDate asc';
    salesOrderResource.isSalesOrderRequest = true;
    this.salesOrderService
      .getAllSalesOrder(salesOrderResource)
      .subscribe((resp: HttpResponse<SalesOrder[]>) => {
        if (resp && resp.body) {
          this.salesOrderRequestList = [...resp.body];
        }
      });
  }

  convertSalesOrderRequest() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const requestId = this.searchForm.get('salesOrderRequestId')?.value;
    this.dialogRef.close(requestId);
  }
}
