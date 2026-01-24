import { Component, inject, OnInit } from '@angular/core';
import { FinancialYear } from '../financial-year';
import { FinancialYearService } from '../financial-year.service';
import { FinancialYearStore } from '../financial-year-store';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { BaseComponent } from '../../../base.component';
import { TranslateModule } from '@ngx-translate/core';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ManageFinancialYearComponent } from '../manage-financial-year/manage-financial-year.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-financial-year-list',
  imports: [
    MatTableModule,
    MatIconModule,
    RouterModule,
    TranslateModule,
    UTCToLocalTime,
    PageHelpTextComponent,
    MatCardModule,
    MatButtonModule,
    HasClaimDirective,
    NgClass
  ],
  templateUrl: './financial-year-list.component.html',
  styleUrl: './financial-year-list.component.scss',
})
export class FinancialYearListComponent
  extends BaseComponent
  implements OnInit {
  financialYear: FinancialYear[] = [];
  displayedColumns: string[] = [
    'action',
    'startDate',
    'endDate',
    'isClosed',
    'closedDate',
    'closedBy',
  ];
  public financialYearStore = inject(FinancialYearStore);
  private commonDialogService = inject(CommonDialogService);
  dialog = inject(MatDialog);
  constructor(private financialYearService: FinancialYearService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getFinancialYears();
  }
  refresh() {
    this.financialYearStore.loadFinancialYears();
  }

  getFinancialYears() {
    this.financialYearStore.loadFinancialYears();
  }

  deleteFinancialYear(financialYear: FinancialYear) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')} ${financialYear.startDate}`)
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.financialYearStore.deleteFinancialYearById(financialYear.id ?? '');
        }
      });
  }

  openManageFinancialYear(financialYear?: FinancialYear) {
    const dialogRef = this.dialog.open(ManageFinancialYearComponent, {
      width: '600px',
      data: financialYear ? financialYear.id : null
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refresh();
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.financialYearStore.financialYears().indexOf(row);
  }
}
