import {
  Component,
  Input,
  OnInit,
  Inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { SalesDeliveryStatusPipe } from '@shared/pipes/sales-delivery-status.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';

@Component({
  selector: 'app-stock-transfer-invoice',
  templateUrl: './stock-transfer-invoice.html',
  styleUrls: ['./stock-transfer-invoice.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatIconModule,
    MatDialogModule,
    UTCToLocalTime,
    SalesDeliveryStatusPipe,
    CustomCurrencyPipe,
    MatButtonModule,
    MatCardModule
  ]
})
export class StockTransferInvoiceComponent implements OnInit {
  @Input() stockTransfer!: StockTransfer;

  constructor(
    public dialogRef: MatDialogRef<StockTransferInvoiceComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StockTransfer
  ) { }

  ngOnInit(): void {
    if (this.data.id) {
      this.stockTransfer = this.data;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

}
