import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DailyPriceService } from '@core/services/daily-price.service';
import { DailyProductPrice } from '@core/domain-classes/daily-product-price';
import { DailyPriceList } from '@core/domain-classes/daily-price-list';
import { UpdateDailyPriceListCommand, DailyPriceUpdateDto } from '@core/domain-classes/daily-price-update';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-daily-price-manager',
  templateUrl: './daily-price-manager.component.html',
  styleUrls: ['./daily-price-manager.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DailyPriceManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentDate: Date = new Date();
  priceData: DailyProductPrice[] = [];
  filteredData: DailyProductPrice[] = [];
  groupedData: Map<string, DailyProductPrice[]> = new Map();
  selectedProduct: DailyProductPrice | null = null;
  groupBy: 'Category' | 'Brand' = 'Category';
  searchTerm: string = '';
  loading: boolean = false;
  saving: boolean = false;
  
  summary = {
    totalProducts: 0,
    updatedCount: 0,
    pendingCount: 0,
    unchangedCount: 0
  };

  constructor(
    private dailyPriceService: DailyPriceService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadPriceList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPriceList(): void {
    this.loading = true;
    this.dailyPriceService
      .getDailyPriceList(this.currentDate, this.groupBy)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: DailyPriceList) => {
          this.priceData = data.prices || [];
          this.filteredData = [...this.priceData];
          this.summary = data.summary;
          this.groupProducts();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading price list:', error);
          this.toastrService.error('Failed to load price list');
          this.loading = false;
        }
      });
  }

  onDateChange(date: Date): void {
    this.currentDate = date;
    this.loadPriceList();
  }

  onGroupByChange(groupBy: 'Category' | 'Brand'): void {
    this.groupBy = groupBy;
    this.groupProducts();
  }

  groupProducts(): void {
    this.groupedData.clear();
    const groupField = this.groupBy === 'Category' ? 'categoryName' : 'brandName';
    
    this.filteredData.forEach(product => {
      const key = product[groupField] || 'Uncategorized';
      if (!this.groupedData.has(key)) {
        this.groupedData.set(key, []);
      }
      this.groupedData.get(key)!.push(product);
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    if (!this.searchTerm) {
      this.filteredData = [...this.priceData];
    } else {
      this.filteredData = this.priceData.filter(p =>
        p.productName?.toLowerCase().includes(this.searchTerm) ||
        p.productCode?.toLowerCase().includes(this.searchTerm)
      );
    }
    this.groupProducts();
  }

  selectProduct(product: DailyProductPrice): void {
    this.selectedProduct = product;
  }

  updateProductPrice(productId: string, newPrice: number): void {
    const product = this.priceData.find(p => p.productId === productId);
    if (product) {
      product.salesPrice = newPrice;
      product.status = 'Updated';
      this.updateSummary();
    }
  }

  updateSummary(): void {
    this.summary.updatedCount = this.priceData.filter(p => p.status === 'Updated').length;
    this.summary.pendingCount = this.priceData.filter(p => p.status === 'Pending').length;
    this.summary.unchangedCount = this.priceData.filter(p => p.status === 'Unchanged').length;
  }

  saveAllChanges(): void {
    const updatedPrices: DailyPriceUpdateDto[] = this.priceData
      .filter(p => p.status === 'Updated')
      .map(p => ({
        productId: p.productId,
        salesPrice: p.salesPrice,
        mrp: p.mrp,
        isActive: p.isActive
      }));

    if (updatedPrices.length === 0) {
      this.toastrService.warning('No changes to save');
      return;
    }

    const command: UpdateDailyPriceListCommand = {
      priceDate: this.currentDate,
      prices: updatedPrices
    };

    this.saving = true;
    this.dailyPriceService
      .updateDailyPriceList(command)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastrService.success('Prices updated successfully');
            this.loadPriceList();
          } else {
            this.toastrService.error(response.message || 'Failed to update prices');
          }
          this.saving = false;
        },
        error: (error) => {
          console.error('Error saving prices:', error);
          this.toastrService.error('Failed to save prices');
          this.saving = false;
        }
      });
  }

  getVariance(product: DailyProductPrice): { amount: number; percentage: number; direction: string } {
    const basePrice = product.baseSalesPrice || 0;
    const variance = product.salesPrice - basePrice;
    const percentage = basePrice ? (variance / basePrice) * 100 : 0;
    const direction = variance > 0 ? 'up' : variance < 0 ? 'down' : 'minus';
    
    return {
      amount: Math.abs(variance),
      percentage: Math.abs(percentage),
      direction
    };
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'Updated': return 'success';
      case 'Pending': return 'warning';
      default: return 'secondary';
    }
  }
}
