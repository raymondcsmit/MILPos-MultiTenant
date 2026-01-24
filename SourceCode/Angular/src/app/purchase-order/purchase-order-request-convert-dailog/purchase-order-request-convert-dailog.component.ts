import { HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PurchaseOrderService } from '../purchase-order.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-purchase-order-request-convert-dailog',
  templateUrl: './purchase-order-request-convert-dailog.component.html',
  styleUrl: './purchase-order-request-convert-dailog.component.scss',
  standalone: true,
  imports: [
    MatIconModule,
    TranslateModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDividerModule,
    MatCardModule,
    MatButtonModule
  ]
})
export class PurchaseOrderRequestConvertDailogComponent extends BaseComponent {
  purchaseOrderRequestList: PurchaseOrder[] = [];
  searchForm: FormGroup;
  constructor(private purchaseOrderService: PurchaseOrderService,
    private dialogRef: MatDialogRef<PurchaseOrderRequestConvertDailogComponent>,
    private fb: FormBuilder
  ) {
    super();
    this.getLangDir();
    this.searchForm = this.fb.group({
      purchaseOrderRequestOrderNumber: [''],
      purchaseOrderRequestId: ['', [Validators.required]]
    });
    this.getPurchaseOrderRequestChange();
    this.getPurchaseOrderRequestList('');
  }

  onCancel() {
    this.dialogRef.close();
  }

  getPurchaseOrderRequestChange() {
    this.searchForm
      .get('purchaseOrderRequestOrderNumber')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((c) => {
        this.getPurchaseOrderRequestList(c);
      });
  }

  getPurchaseOrderRequestList(orderNumber: string) {
    const purchaseOrderResource = new PurchaseOrderResourceParameter();
    purchaseOrderResource.orderNumber = orderNumber;
    purchaseOrderResource.pageSize = 5;
    purchaseOrderResource.orderBy = 'poCreatedDate asc';
    purchaseOrderResource.isPurchaseOrderRequest = true;
    this.purchaseOrderService
      .getAllPurchaseOrder(purchaseOrderResource)
      .subscribe((resp: HttpResponse<PurchaseOrder[]>) => {
        if (resp && resp.headers && resp.body) {
          this.purchaseOrderRequestList = [...resp.body];
        }
      });
  }

  convertPurchaseOrderRequest() {
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const requestId = this.searchForm.get('purchaseOrderRequestId')?.value;
    this.dialogRef.close(requestId);
  }
}
