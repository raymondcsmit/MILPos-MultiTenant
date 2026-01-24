import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ProductCategory } from '@core/domain-classes/product-category';
import { ProductCategoryService } from '@core/services/product-category.service';
import { ManageProductCategoryComponent } from '../manage-product-category/manage-product-category.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatIconModule } from '@angular/material/icon';
import { BaseComponent } from '../../base.component';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from '@core/services/toastr.service';



@Component({
  selector: 'app-product-category-list',
  templateUrl: './product-category-list.component.html',
  styleUrls: ['./product-category-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    HasClaimDirective,
    MatIconModule,
    NgClass,
    MatButtonModule,
    MatCardModule
  ]
})
export class ProductCategoryListComponent
  extends BaseComponent
  implements OnInit {
  productCategories: ProductCategory[] = [];
  columnsToDisplay: string[] = ['action', 'name', 'description'];
  subCategoryColumnToDisplay: string[] = ['action', 'name', 'description'];
  subCategories: ProductCategory[] = [];
  expandedElement!: ProductCategory | null;


  constructor(
    private productCategoryService: ProductCategoryService,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
    private cd: ChangeDetectorRef
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getCategories();
  }

  getCategories(): void {
    this.productCategoryService.getAll(false).subscribe(c => this.productCategories = c);
  }

  getSubCategories(parentId: string): void {
    this.productCategoryService.getAllSubCategories(parentId).subscribe(c => this.subCategories = c);
  }

  toggleRow(element: ProductCategory) {
    if (this.expandedElement?.id === element.id) {
      this.expandedElement = null;
      this.subCategories = [];
    } else {
      this.expandedElement = { ...element };
      this.getSubCategories(element.id);
    }
    this.cd.detectChanges();
  }

  deleteCategory(category: ProductCategory): void {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(
        `${this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
        )} ${category.name}`
      )
      .subscribe((isTrue) => {
        if (isTrue) {
          this.productCategoryService.delete(category.id).subscribe((d) => {
            this.toastrService.success(
              this.translationService.getValue(`CATEGORY_DELETED_SUCCESSFULLY`)
            );
            if (category.parentId) {
              this.subCategories = this.subCategories.filter(s => s.id !== category.id);
            } else {
              this.productCategories = this.productCategories.filter(s => s.id !== category.id);
            }
          });
        }
      });
  }

  manageCategory(category: ProductCategory | null): void {
    const dialogRef = this.dialog.open(ManageProductCategoryComponent, {
      maxWidth: '350px',
      width: '100%',
      direction: this.langDir,
      data: Object.assign({}, category),
    });

    this.sub$.sink = dialogRef
      .afterClosed()
      .subscribe((result: ProductCategory) => {
        if (result) {
          if (result.parentId) {
            const exists = this.subCategories.some(c => c.id === result.id);

            if (exists) {
              this.subCategories = this.subCategories.map((item) =>
                item.id === result.id ? { ...result } : item
              );
            } else {
              this.subCategories = [result, ...this.subCategories].sort((a, b) => a.name.localeCompare(b.name));
            }
            this.cd.detectChanges();
          } else {
            this.productCategories = this.productCategories.map((item) =>
              item.id === result.id ? { ...result } : item
            );
            if (!category) {
              this.productCategories = [result, ...this.productCategories].sort((a, b) => a.name.localeCompare(b.name));
            }
            this.cd.detectChanges();
          }
        }
      });
  }

  addSubCategory(category: ProductCategory) {
    this.manageCategory({
      id: '',
      description: '',
      name: '',
      parentId: category.id,
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.productCategories.indexOf(row);
  }
}
