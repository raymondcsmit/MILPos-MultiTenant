
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { BaseComponent } from '../../base.component';
import { BookCloseService } from './book-close-service';
import { ToastrService } from '@core/services/toastr.service';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { FinancialYearStore } from '../financial-year/financial-year-store';
import { UTCToLocalTime } from "../../shared/pipes/utc-to-local-time.pipe";

@Component({
  selector: 'app-book-close',
  imports: [
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    UTCToLocalTime
  ],
  templateUrl: './book-close.html',
  styleUrl: './book-close.scss'
})
export class BookClose extends BaseComponent implements OnInit {
  confirmText: string = '';
  showConfirmError: boolean = false;
  financialYearStore = inject(FinancialYearStore);
  bookCloseService = inject(BookCloseService);
  toaster = inject(ToastrService);
  route = inject(Router);
  commonDialogService = inject(CommonDialogService);

  get isConfirmSuccess(): boolean {
    return this.confirmText === 'CLOSE';
  }

  ngOnInit(): void { }

  closeFinancialYear() {
    this.validateConfirmInput();
    if (!this.isConfirmSuccess) {
      return;
    }
    this.commonDialogService
      .deleteConformationDialog(this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_CLOSE_FINANCIAL_YEAR'))
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.bookCloseService.closeFinancialYear().subscribe({
            next: () => {
              this.showConfirmError = false;
              this.confirmText = '';
              this.toaster.success(this.translationService.getValue('FINANCIAL_YEAR_CLOSED_SUCCESSFULLY'));
              this.route.navigate(['/dashboard']);
              this.financialYearStore.loadFinancialYears();
            }
          });
        }
      });
  }

  onConfirmTextChange(value: string) {
    this.confirmText = value;
    this.showConfirmError = value.length > 0 && !this.isConfirmSuccess;
  }

  validateConfirmInput() {
    this.showConfirmError = !this.isConfirmSuccess;
  }
}
