import { Component, OnInit, ViewChild } from '@angular/core';
import { Brand } from '@core/domain-classes/brand';
import { BrandService } from '@core/services/brand.service';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ManageBrandComponent } from '../manage-brand/manage-brand.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { environment } from '@environments/environment';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-brand-list',
  templateUrl: './brand-list.component.html',
  styleUrls: ['./brand-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    HasClaimDirective,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class BrandListComponent extends BaseComponent implements OnInit {
  brands: Brand[] = [];
  displayedColumns: string[] = ['action', 'imageUrl', 'name'];
  footerToDisplayed = ['footer'];
  baseUrl = environment.apiUrl;

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
    private brandService: BrandService,
    private toastrService: ToastrService
  ) {
    super();
    this.getLangDir();
    // this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.brandService.getAll().subscribe((c: Brand[]) => {
      this.brands = c;
    });
  }

  deleteBrand(brand: Brand): void {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService.deleteConformationDialog(`${areU} :: ${brand.name}`)
      .subscribe((isTrue: any) => {
        if (isTrue) {
          this.sub$.sink = this.brandService.delete(brand.id ?? '').subscribe(() => {
            this.toastrService.success(this.translationService.getValue('BRAND_DELETED_SUCCESSFULLY'));
            this.brands = this.brands.filter(c => c.id !== brand.id);
          });
        }
      });
  }

  manageBrand(brand: Brand | null): void {
    const dialogRef = this.dialog.open(ManageBrandComponent, {
      width: '110vh',
      direction: this.langDir,
      data: Object.assign({}, brand)
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result: Brand) => {
      if (result) {
        const brandIndex = this.brands.findIndex(c => c.id === result.id);
        if (brandIndex > -1) {
          const updatedBrands = [...this.brands];
          updatedBrands[brandIndex] = result;
          this.brands = updatedBrands;
        } else {
          this.brands = [...this.brands, result];
        }
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.brands.indexOf(row);
  }
}
