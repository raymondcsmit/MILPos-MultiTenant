import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../inventory.service';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryResourceParameter } from '@core/domain-classes/inventory-resource-parameter';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from '@core/services/toastr.service';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { Tax } from '@core/domain-classes/tax';
import { TaxService } from '@core/services/tax.service';

@Component({
  selector: 'app-product-stock-bulk-update',
  templateUrl: './product-stock-bulk-update.component.html',
  styleUrls: ['./product-stock-bulk-update.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ProductStockBulkUpdateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  allProducts: Inventory[] = [];
  groupedData: Map<string, Inventory[]> = new Map();
  locations: BusinessLocation[] = [];
  taxes: Tax[] = [];
  
  // State
  selectedProduct: Inventory | null = null;
  groupBy: 'Category' | 'Brand' = 'Category';
  searchTerm: string = '';
  loading: boolean = false;
  saving: boolean = false;
  
  // Update Logic
  pendingUpdates: any[] = []; // List of AddProductStockCommand objects
  
  // Form Model
  currentUpdate = {
     currentStock: 0, // Absolute value derived from input, sign applied on add
     pricePerUnit: 0,
     locationId: '',
     productId: '',
     unitId: '',
     productTaxes: [] as any[],
     taxIds: [] as string[], // Helper
     paymentMethod: 0, // Cash
     referenceNumber: ''
  };
  currentUpdateOperation: 'add' | 'remove' = 'add';
  selectedTaxId: string | null = null;
  
  constructor(
    private inventoryService: InventoryService,
    private toastrService: ToastrService,
    private commonService: CommonService,
    private taxService: TaxService
  ) {}

  ngOnInit(): void {
    this.loadLocations();
    this.loadTaxes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLocations() {
      this.commonService.getLocationsForCurrentUser().subscribe(res => {
          this.locations = res.locations;
          if(this.locations.length > 0 && this.locations[0].id) {
              this.currentUpdate.locationId = this.locations[0].id;
              // Now that we have a location, load products
              this.loadProducts();
          }
      });
  }

  loadTaxes() {
      this.taxService.getAll().subscribe(res => {
          this.taxes = res;
      });
  }

  loadProducts(): void {
    if (!this.currentUpdate.locationId) return;

    this.loading = true;
    const resource = new InventoryResourceParameter();
    resource.pageSize = 1000;
    resource.orderBy = 'productName asc';
    resource.locationId = this.currentUpdate.locationId;
    
    this.inventoryService.getInventories(resource)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.allProducts = resp.body || [];
          this.groupProducts();
          this.loading = false;
        },
        error: (err) => {
          this.toastrService.error('Failed to load products');
          this.loading = false;
        }
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.groupProducts();
  }

  onGroupByChange(groupBy: 'Category' | 'Brand'): void {
    this.groupBy = groupBy;
    this.groupProducts();
  }

  groupProducts(): void {
    this.groupedData.clear();
    const groupField = this.groupBy === 'Category' ? 'categoryName' : 'brandName';
    
    const filtered = this.searchTerm 
        ? this.allProducts.filter(p => p.productName?.toLowerCase().includes(this.searchTerm))
        : this.allProducts;

    filtered.forEach(product => {
      const key = (product as any)[groupField] || 'Uncategorized';
      if (!this.groupedData.has(key)) {
        this.groupedData.set(key, []);
      }
      this.groupedData.get(key)!.push(product);
    });
  }
  
  toSafeId(key: string): string {
      return key.replace(/[^a-zA-Z0-9]/g, '_');
  }

  selectProduct(product: Inventory): void {
    this.selectedProduct = product;
    
    // Reset form for new product
    this.currentUpdate.productId = product.productId || '';
    this.currentUpdate.unitId = product.unitId || '';
    this.currentUpdate.currentStock = 0;
    this.currentUpdate.pricePerUnit = product.averageSalesPrice || 0;
    this.currentUpdate.referenceNumber = '';
  }
  
  onTaxChange() {
      // Logic to sync selectedTaxId to productTaxes array if needed
  }

  addToQueue() {
      if (!this.selectedProduct) return;
      if (this.currentUpdate.currentStock <= 0) {
          this.toastrService.warning('Quantity must be greater than 0');
          return;
      }
      if (!this.currentUpdate.referenceNumber) {
          this.toastrService.warning('Reference Number is required');
          return;
      }

      const qty = this.currentUpdateOperation === 'add' ? this.currentUpdate.currentStock : -this.currentUpdate.currentStock;
      
      const taxItem = this.selectedTaxId ? this.taxes.find(t => t.id === this.selectedTaxId) : null;
      const productTaxes = taxItem ? [{ taxId: taxItem.id, taxName: taxItem.name, percentage: taxItem.percentage }] : [];

      const updateCommand = {
          ...this.currentUpdate,
          currentStock: qty,
          productTaxes: productTaxes
          // taxIds: productTaxes.map(t => t.taxId) // The command might expect one or the other
      };
      
      // Clone to break reference
      this.pendingUpdates.push(JSON.parse(JSON.stringify(updateCommand)));
      
      this.toastrService.info('Added to queue');
      
      // Reset critical fields
      this.currentUpdate.currentStock = 0;
      // Keep Ref and Location? Usually Ref changes. 
      this.currentUpdate.referenceNumber = '';
  }

  removeFromQueue(index: number) {
      this.pendingUpdates.splice(index, 1);
  }
  
  hasPendingUpdate(productId: string): boolean {
      return this.pendingUpdates.some(u => u.productId === productId);
  }
  
  getProductName(productId: string): string {
      const p = this.allProducts.find(x => x.productId === productId);
      return p ? p.productName : 'Unknown';
  }
  
  getLocationName(locationId: string): string {
      const l = this.locations.find(x => x.id === locationId);
      return l ? l.name : 'Unknown';
  }

  saveAllChanges(): void {
    if (this.pendingUpdates.length === 0) return;

    const bulkCommand = {
        stockUpdates: this.pendingUpdates
    };

    this.saving = true;
    this.inventoryService.bulkUpdateProductStock(bulkCommand)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
            if (response.success) {
                this.toastrService.success('Stock updated successfully');
                this.pendingUpdates = [];
                this.loadProducts(); // Refresh stock
            } else {
                this.toastrService.error('Failed to update stock');
            }
            this.saving = false;
        },
        error: (error) => {
          console.error('Error saving stock:', error);
          this.toastrService.error('Failed to save stock');
          this.saving = false;
        }
      });
  }
}
