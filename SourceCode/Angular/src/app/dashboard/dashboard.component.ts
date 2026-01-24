import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../base.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { StatisticsComponent } from './statistics/statistics.component';
import { BestSellingProductComponent } from './best-selling-product/best-selling-product.component';
import { SalesOrderExpectedShipmentComponent } from './sales-order-expected-shipment/sales-order-expected-shipment.component';
import { PurchaseOrderExpectedDeliveryComponent } from './purchase-order-expected-delivery/purchase-order-expected-delivery.component';
import { ProductStockAlertComponent } from './product-stock-alert/product-stock-alert.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    HasClaimDirective,
    StatisticsComponent,
    BestSellingProductComponent,
    SalesOrderExpectedShipmentComponent,
    PurchaseOrderExpectedDeliveryComponent,
    ProductStockAlertComponent,
  ]
})
export class DashboardComponent extends BaseComponent implements OnInit {
  constructor() {
    super();
  }

  ngOnInit() {
  }
}

