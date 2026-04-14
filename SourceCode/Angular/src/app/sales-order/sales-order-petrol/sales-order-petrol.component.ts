import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { Product } from '@core/domain-classes/product';
import { HttpResponse } from '@angular/common/http';
import { ProductService } from '../../product/product.service';
import { SalesOrderService } from '../sales-order.service';
import { SalesOrderCalculationService } from '../sales-order-calculation.service';
import { Customer } from '@core/domain-classes/customer';
import { CustomerService } from '../../customer/customer.service';
import { ToastrService } from '../../core/services/toastr.service';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';
import { SalesDeliveryStatusEnum } from '../../core/domain-classes/sales-delivery-statu';
import { SecurityService } from '@core/security/security.service';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';

// Mock Nozzle Interface
interface Nozzle {
    id: string;
    name: string;
    pumpName: string;
    productName: string;
    productId: string;
    lastReading: number;
    status: 'Active' | 'Busy' | 'Maintenance';
}

@Component({
  selector: 'app-sales-order-petrol',
  templateUrl: './sales-order-petrol.component.html',
  styleUrls: ['./sales-order-petrol.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SalesOrderPetrolComponent implements OnInit {
  salesOrder: SalesOrder = {
    orderNumber: '',
    soCreatedDate: new Date(),
    salesOrderStatus: SalesOrderStatusEnum.Not_Return,
    deliveryDate: new Date(),
    deliveryStatus: SalesDeliveryStatusEnum.Pending,
    customerId: '',
    locationId: '',
    totalAmount: 0,
    totalTax: 0,
    flatDiscount: 0,
    totalDiscount: 0,
    salesOrderItems: [],
    totalRefundAmount: 0,
    isSalesOrderRequest: false
  };

  products: Product[] = [];
  customers: Customer[] = [];
  nozzles: Nozzle[] = [];
  
  // Selection State
  selectedNozzle: Nozzle | null = null;
  meterStart: number = 0;
  meterEnd: number = 0;
  calculatedQty: number = 0;
  selectedProductPrice: number = 0;

  constructor(
    private productService: ProductService,
    private salesOrderService: SalesOrderService,
    private calculationService: SalesOrderCalculationService,
    private customerService: CustomerService,
    private toastr: ToastrService,
    private securityService: SecurityService
  ) { }

  ngOnInit(): void {
    this.initSalesOrder();
    this.loadCustomers();
    this.loadFuelProducts(); // Load specific fuel products if possible
  }

  initSalesOrder() {
     this.salesOrderService.getNewSalesOrderNumber(false).subscribe((num: SalesOrder) => {
         this.salesOrder.orderNumber = num.orderNumber;
     });
     
     const user = this.securityService.getUserDetail();
     if (user) {
         this.salesOrder.locationId = this.securityService.SelectedLocation;
     }
  }
  
  loadCustomers() {
      this.customerService.getCustomersForDropDown('', '').subscribe((resp: Customer[]) => {
          this.customers = resp;
          if (this.customers.length > 0) {
              this.salesOrder.customerId = this.customers[0].id || '';
          }
      });
  }

  loadFuelProducts() {
      // For now get all products, but in real app filter by category 'Fuel'
      const params = new ProductResourceParameter();
      params.pageSize = 50;
      this.productService.getProducts(params).subscribe((resp: HttpResponse<Product[]>) => {
          this.products = resp.body || [];
          this.initMockNozzles();
      });
  }
  
  initMockNozzles() {
      // Map products to nozzles for demo
      if (this.products.length === 0) return;
      
      const petrol = this.products.find(p => p.name.toLowerCase().includes('petrol')) || this.products[0];
      const diesel = this.products.find(p => p.name.toLowerCase().includes('diesel')) || this.products[1] || this.products[0];
      
      this.nozzles = [
          { id: 'N1', name: 'Nozzle 1', pumpName: 'Pump 01', productName: petrol?.name, productId: petrol?.id || '', lastReading: 10500, status: 'Active' },
          { id: 'N2', name: 'Nozzle 2', pumpName: 'Pump 01', productName: diesel?.name, productId: diesel?.id || '', lastReading: 5400, status: 'Active' },
          { id: 'N3', name: 'Nozzle 3', pumpName: 'Pump 02', productName: petrol?.name, productId: petrol?.id || '', lastReading: 12000, status: 'Busy' },
          { id: 'N4', name: 'Nozzle 4', pumpName: 'Pump 02', productName: diesel?.name, productId: diesel?.id || '', lastReading: 6000, status: 'Active' }
      ];
  }

  selectNozzle(nozzle: Nozzle) {
      this.selectedNozzle = nozzle;
      this.meterStart = nozzle.lastReading;
      this.meterEnd = nozzle.lastReading; // Default
      this.calculateDiff();
      
      const prod = this.products.find(p => p.id === nozzle.productId);
      this.selectedProductPrice = prod?.salesPrice || 0;
  }
  
  calculateDiff() {
      this.calculatedQty = this.meterEnd - this.meterStart;
      if (this.calculatedQty < 0) this.calculatedQty = 0;
  }

  addToCart() {
    if (!this.selectedNozzle || this.calculatedQty <= 0) return;
    
    const newItem: SalesOrderItem = {
        productId: this.selectedNozzle.productId,
        unitPrice: this.selectedProductPrice,
        quantity: this.calculatedQty,
        taxValue: 0,
        discount: 0,
        discountPercentage: 0,
        productName: this.selectedNozzle.productName,
        salesOrderItemTaxes: [],
        salesOrderId: this.salesOrder.id,
        // Petrol Fields
        nozzleId: this.selectedNozzle.id,
        meterReadingStart: this.meterStart,
        meterReadingEnd: this.meterEnd
    };
    
    this.salesOrder.salesOrderItems.push(newItem);
    this.updateTotals();
    
    // Reset selection logic if needed
    // this.selectedNozzle = null; 
  }

  removeFromCart(index: number) {
    this.salesOrder.salesOrderItems.splice(index, 1);
    this.updateTotals();
  }

  updateTotals() {
    this.calculationService.calculateTotals(this.salesOrder, []);
  }

  clearCart() {
      this.salesOrder.salesOrderItems = [];
      this.updateTotals();
  }

  get totalVolume(): number {
      return this.salesOrder.salesOrderItems.reduce((acc, i) => acc + i.quantity, 0);
  }

  saveOrder() {
    if (this.salesOrder.salesOrderItems.length === 0) {
      this.toastr.warning('Cart is empty');
      return;
    }
    
    this.salesOrderService.addSalesOrder(this.salesOrder).subscribe({
      next: (resp) => {
        this.toastr.success('Sales Entry Saved');
        this.clearCart();
        this.initSalesOrder();
        // Update mock nozzle readings
        if (this.selectedNozzle) {
            // In real app, backend updates this.
            this.selectedNozzle.lastReading = this.meterEnd;
        }
      },
      error: (err) => {
        this.toastr.error('Failed to save order');
      }
    });
  }
}
