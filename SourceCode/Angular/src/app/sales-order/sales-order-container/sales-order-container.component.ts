import { Component, OnInit } from '@angular/core';
import { SecurityService } from '@core/security/security.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SalesOrderRetailComponent } from '../sales-order-retail/sales-order-retail.component';
import { SalesOrderPharmacyComponent } from '../sales-order-pharmacy/sales-order-pharmacy.component';
import { SalesOrderPetrolComponent } from '../sales-order-petrol/sales-order-petrol.component';
import { SalesOrderAddEditComponent } from '../sales-order-add-edit/sales-order-add-edit.component';

@Component({
  selector: 'app-sales-order-container',
  templateUrl: './sales-order-container.component.html',
  styleUrls: ['./sales-order-container.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SalesOrderRetailComponent,
    SalesOrderPharmacyComponent,
    SalesOrderPetrolComponent,
    SalesOrderAddEditComponent
  ]
})
export class SalesOrderContainerComponent implements OnInit {
  businessType: number = 0; // Default to Retail (0)

  constructor(
    private securityService: SecurityService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.securityService.companyProfile.subscribe((profile) => {
      if (profile) {
        this.businessType = profile.businessType || 0;
      }
    }); 
  }
}
