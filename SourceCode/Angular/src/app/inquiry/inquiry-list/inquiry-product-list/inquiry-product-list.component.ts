import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Inquiry } from '@core/domain-classes/inquiry';
import { Product } from '@core/domain-classes/product';
import { InquiryService } from '../../inquiry.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../../base.component';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-inquiry-product-list',
  templateUrl: './inquiry-product-list.component.html',
  styleUrls: ['./inquiry-product-list.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule,
    CustomCurrencyPipe,
    MatCardModule,
    NgClass
  ]
})
export class InquiryProductListComponent extends BaseComponent implements OnInit {
  products: Product[] = [];
  displayedColumns = ['name', 'brand', 'category', 'salesPrice', 'purchasePrice', 'mrp'];
  constructor(
    private inquiryService: InquiryService,
    public dialogRef: MatDialogRef<InquiryProductListComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Inquiry) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    if (this.data) {
      this.getProductsList();
    }
  }

  getProductsList() {
    this.sub$.sink = this.inquiryService
      .getProductsByInquiryId(this.data.id ?? '')
      .subscribe((c) => {
        this.products = c;
      });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.products.indexOf(row);
  }
}
