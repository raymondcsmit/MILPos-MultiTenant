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
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { SalesOrderStatusEnum } from '@core/domain-classes/sales-order-status';
import { SalesDeliveryStatusEnum } from '../../core/domain-classes/sales-delivery-statu';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { SecurityService } from '@core/security/security.service';
import { InventoryBatchService } from '../../core/services/inventory-batch.service';
import { InventoryBatch } from '@core/domain-classes/inventory-batch';

@Component({
  selector: 'app-sales-order-pharmacy',
  templateUrl: './sales-order-pharmacy.component.html',
  styleUrls: ['./sales-order-pharmacy.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SalesOrderPharmacyComponent implements OnInit {
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
  searchSubject = new Subject<string>();
  
  // Batches
  batches: InventoryBatch[] = [];
  
  // Batch Popup State
  showBatchModal: boolean = false;
  selectedProduct: Product | null = null;
  selectedBatch: string = '';
  selectedExpiry: Date | undefined;
  qtyToAdd: number = 1;

  constructor(
    private productService: ProductService,
    private salesOrderService: SalesOrderService,
    private calculationService: SalesOrderCalculationService,
    private customerService: CustomerService,
    private toastr: ToastrService,
    private securityService: SecurityService,
    private inventoryBatchService: InventoryBatchService
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

  // Open Modal instead of direct add
  onProductSelect(product: Product) {
      this.selectedProduct = product;
      this.showBatchModal = true;
      this.qtyToAdd = 1;
      this.batches = [];
      
      if (product.id) {
          this.inventoryBatchService.getBatches(product.id).subscribe(batches => {
              this.batches = batches;
              if (this.batches.length > 0) {
                  this.selectedBatch = this.batches[0].batchNumber;
                  this.selectedExpiry = this.batches[0].expiryDate;
              } else {
                  this.selectedBatch = '';
                  this.selectedExpiry = undefined;
              }
          });
      }
  }
  
  selectBatch(batch: InventoryBatch) {
      this.selectedBatch = batch.batchNumber;
      this.selectedExpiry = batch.expiryDate;
  }
  
  confirmAddToBatch() {
      if (!this.selectedProduct) return;
      
      this.addToCart(this.selectedProduct, {
          batchNumber: this.selectedBatch,
          expiryDate: this.selectedExpiry,
          quantity: this.qtyToAdd
      });
      
      this.showBatchModal = false;
      this.selectedProduct = null;
  }

  addToCart(product: Product, batchInfo: any) {
    // Pharmacy: Each batch is likely a separate line item or merged?
    // Let's keep separate execution for different batches.
    const newItem: SalesOrderItem = {
        productId: product.id || '',
        unitPrice: product.salesPrice || 0,
        quantity: batchInfo.quantity,
        taxValue: 0,
        discount: 0,
        discountPercentage: 0,
        productName: product.name,
        salesOrderItemTaxes: [],
        salesOrderId: this.salesOrder.id,
        // New Fields
        batchNumber: batchInfo.batchNumber,
        expiryDate: batchInfo.expiryDate
    };
    this.salesOrder.salesOrderItems.push(newItem);
    this.updateTotals();
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

  saveOrder() {
    if (this.salesOrder.salesOrderItems.length === 0) {
      this.toastr.warning('Cart is empty');
      return;
    }
    this.salesOrderService.addSalesOrder(this.salesOrder).subscribe({
      next: (resp) => {
        this.toastr.success('Prescription Order Saved');
        this.clearCart();
        this.initSalesOrder();
      },
      error: (err) => {
        this.toastr.error('Failed to save order');
      }
    });
  }
  
  closeModal() {
      this.showBatchModal = false;
  }
}
