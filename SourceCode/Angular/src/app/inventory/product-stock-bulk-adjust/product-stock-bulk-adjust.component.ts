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

@Component({
  selector: 'app-product-stock-bulk-adjust',
  templateUrl: './product-stock-bulk-adjust.component.html',
  styleUrls: ['./product-stock-bulk-adjust.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ProductStockBulkAdjustComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  allProducts: Inventory[] = [];
  groupedData: Map<string, Inventory[]> = new Map();
  locations: BusinessLocation[] = [];
  
  // State
  selectedProduct: Inventory | null = null;
  groupBy: 'Category' | 'Brand' = 'Category';
  searchTerm: string = '';
  loading: boolean = false;
  saving: boolean = false;
  
  // Queue
  pendingAdjustments: any[] = []; // List of ProductStockAdjustmentDto
  
  // Form Model
  currentAdjust = {
     locationId: '',
     productId: '',
     newStockValue: 0
  };
  
  constructor(
    private inventoryService: InventoryService,
    private toastrService: ToastrService,
    private commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.loadLocations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLocations() {
      this.commonService.getLocationsForCurrentUser().subscribe(res => {
          this.locations = res.locations;
          if(this.locations.length > 0 && this.locations[0].id) {
              this.currentAdjust.locationId = this.locations[0].id;
              // Now that we have a location, load products
              this.loadProducts();
          }
      });
  }

  loadProducts(): void {
    if (!this.currentAdjust.locationId) return;

    this.loading = true;
    const resource = new InventoryResourceParameter();
    resource.pageSize = 1000;
    resource.orderBy = 'productName asc';
    resource.locationId = this.currentAdjust.locationId;
    
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
    this.currentAdjust.productId = product.productId || '';
    this.currentAdjust.newStockValue = product.currentStock || 0; // Default to current stock for easy adjustment
  }

  addToQueue() {
      if (!this.selectedProduct) return;
      if (this.currentAdjust.newStockValue < 0) {
          this.toastrService.warning('Stock cannot be negative');
          return;
      }

      // Check if already in queue and update if so
      const existingIndex = this.pendingAdjustments.findIndex(x => x.productId === this.currentAdjust.productId);
      
      const adjustment = {
          productId: this.currentAdjust.productId,
          locationId: this.currentAdjust.locationId,
          newStockValue: this.currentAdjust.newStockValue
      };

      if (existingIndex >= 0) {
          this.pendingAdjustments[existingIndex] = adjustment;
          this.toastrService.info('Updated pending adjustment');
      } else {
          this.pendingAdjustments.push(adjustment);
          this.toastrService.info('Added to queue');
      }
      
      this.selectedProduct = null; // Deselect after adding
  }

  removeFromQueue(index: number) {
      this.pendingAdjustments.splice(index, 1);
  }
  
  hasPendingUpdate(productId: string): boolean {
      return this.pendingAdjustments.some(u => u.productId === productId);
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
    if (this.pendingAdjustments.length === 0) return;

    const bulkCommand = {
        adjustments: this.pendingAdjustments
    };

    this.saving = true;
    this.inventoryService.bulkAdjustProductStock(bulkCommand)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
            if (response.success) {
                this.toastrService.success('Stock adjusted successfully');
                this.pendingAdjustments = [];
                this.loadProducts(); // Refresh stock
            } else {
                this.toastrService.error('Failed to adjust stock');
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
