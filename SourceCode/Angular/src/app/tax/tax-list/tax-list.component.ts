import { Component, OnInit } from '@angular/core';
import { Tax } from '@core/domain-classes/tax';
import { TaxService } from '@core/services/tax.service';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatDialog } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ManageTaxComponent } from '../manage-tax/manage-tax.component';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-tax-list',
  templateUrl: './tax-list.component.html',
  styleUrls: ['./tax-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    HasClaimDirective,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    NgClass
  ]

})
export class TaxListComponent extends BaseComponent implements OnInit {
  displayedColumns: string[] = ['action', 'name', 'percentage'];
  taxes: Tax[] = [];

  constructor(
    private taxService: TaxService,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getTaxes();
  }

  getTaxes(): void {
    this.taxService.getAll().subscribe((c: Tax[]) => {
      if (c.length > 0) {
        this.taxes = c;
      } else {
        this.taxes = [];
      }
    });
  }

  deleteTax(tax: Tax): void {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService.deleteConformationDialog(`${areU} :: ${tax.name}`).subscribe(isTrue => {
      if (isTrue) {
        this.sub$.sink = this.taxService.delete(tax.id).subscribe(() => {
          this.toastrService.success(this.translationService.getValue('TAX_DELETED_SUCCESSFULLY'));
          this.taxes = this.taxes.filter(t => t.id !== tax.id);
        });
      }
    })
  }

  manageTax(tax: Tax | null): void {
    const dialogRef = this.dialog.open(ManageTaxComponent, {
      width: '350px',
      data: Object.assign({}, tax)
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const taxIndex = this.taxes.findIndex(c => c.id === result.id);
        if (taxIndex > -1) {
          const updatedTaxes = [...this.taxes];
          updatedTaxes[taxIndex] = result;
          this.taxes = updatedTaxes;
        } else {
          this.taxes = [...this.taxes, result];
        }
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.taxes.indexOf(row);
  }
}


