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
import { Router } from '@angular/router';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';
import { SalesDeliveryStatusEnum } from '../../core/domain-classes/sales-delivery-statu';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { SecurityService } from '@core/security/security.service';

@Component({
  selector: 'app-sales-order-retail',
  templateUrl: './sales-order-retail.component.html',
  styleUrls: ['./sales-order-retail.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SalesOrderRetailComponent implements OnInit {
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
  categories: any[] = [];
  customers: Customer[] = [];
  searchQuery: string = '';
  searchSubject = new Subject<string>();
  
  selectedCategory: string = 'All';

  constructor(
    private productService: ProductService,
    private salesOrderService: SalesOrderService,
    private calculationService: SalesOrderCalculationService,
    private customerService: CustomerService,
    private toastr: ToastrService,
    private router: Router,
    private securityService: SecurityService
  ) { }

  ngOnInit(): void {
    this.initSalesOrder();
    this.loadProducts();
    this.loadCustomers();
    
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(query => {
        const params = new ProductResourceParameter();
        params.searchQuery = query;
        params.pageSize = 50;
        return this.productService.getProducts(params);
      })
    ).subscribe((resp: HttpResponse<Product[]>) => {
      this.products = resp.body || [];
    });
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

  loadProducts() {
    const params = new ProductResourceParameter();
    params.pageSize = 50;
    this.productService.getProducts(params).subscribe((resp: HttpResponse<Product[]>) => {
      this.products = resp.body || [];
    });
  }
  
  loadCustomers() {
      this.customerService.getCustomersForDropDown('', '').subscribe((resp: Customer[]) => {
          this.customers = resp;
          if (this.customers.length > 0) {
              this.salesOrder.customerId = this.customers[0].id || '';
          }
      });
  }

  onSearch(query: any) {
    this.searchSubject.next(query.target.value);
  }

  addToCart(product: Product) {
    const existing = this.salesOrder.salesOrderItems.find(i => i.productId === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      const newItem: SalesOrderItem = {
        productId: product.id || '',
        unitPrice: product.salesPrice || 0,
        quantity: 1,
        taxValue: 0,
        discount: 0,
        discountPercentage: 0,
        productName: product.name,
        salesOrderItemTaxes: [],
        salesOrderId: this.salesOrder.id
      };
      this.salesOrder.salesOrderItems.push(newItem);
    }
    this.updateTotals();
  }

  removeFromCart(index: number) {
    this.salesOrder.salesOrderItems.splice(index, 1);
    this.updateTotals();
  }
  
  decreaseQty(item: SalesOrderItem) {
      if (item.quantity > 1) {
          item.quantity--;
          this.updateTotals();
      }
  }
  
  increaseQty(item: SalesOrderItem) {
      item.quantity++;
      this.updateTotals();
  }

  updateTotals() {
    this.calculationService.calculateTotals(this.salesOrder, []);
  }
  
  clearCart() {
      this.salesOrder.salesOrderItems = [];
      this.updateTotals();
  }

  saveOrder() {
    if (this.salesOrder.salesOrderItems.length === 0) {
      this.toastr.warning('Cart is empty');
      return;
    }
    this.salesOrderService.addSalesOrder(this.salesOrder).subscribe({
      next: (resp) => {
        this.toastr.success('Order Saved Successfully');
        this.clearCart();
        this.initSalesOrder();
      },
      error: (err) => {
        this.toastr.error('Failed to save order');
      }
    });
  }
}
