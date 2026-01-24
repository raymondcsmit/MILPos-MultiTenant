import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ProductQuantityAlert } from '@core/domain-classes/product-quantity-alert';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-product-stock-alert-dailog',
  imports: [
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    TranslateModule,
    MatCardModule
  ],
  templateUrl: './product-stock-alert-dailog.component.html',
  styleUrl: './product-stock-alert-dailog.component.scss'
})
export class ProductStockAlertDailogComponent extends BaseComponent {
  displayedColumns = ['name', 'quantity'];
  constructor(public dialogRef: MatDialogRef<ProductStockAlertDailogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductQuantityAlert[]) {
    super();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  proceed() {
    this.dialogRef.close(true);
  }
}
