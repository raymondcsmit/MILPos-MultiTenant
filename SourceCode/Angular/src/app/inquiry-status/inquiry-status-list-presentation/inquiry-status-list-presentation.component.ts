import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';
import { ManageInquiryStatusComponent } from '../manage-inquiry-status/manage-inquiry-status.component';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-inquiry-status-list-presentation',
  templateUrl: './inquiry-status-list-presentation.component.html',
  styleUrls: ['./inquiry-status-list-presentation.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    TranslateModule,
    PageHelpTextComponent,
    HasClaimDirective,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class InquiryStatusListPresentationComponent extends BaseComponent implements OnInit {
  @Input() inquiryStatuses!: InquiryStatus[];
  @Output() deleteInquiryStatusHandler: EventEmitter<string> = new EventEmitter<string>();
  displayedColumns: string[] = ['action', 'name'];
  toastrService = inject(ToastrService);

  constructor(
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
  ) {
    super();
  }

  ngOnInit(): void {
  }

  deleteInquiryStatus(inquiryStatus: InquiryStatus): void {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService.deleteConformationDialog(`${areU} :: ${inquiryStatus.name}`)
      .subscribe(isTrue => {
        if (isTrue) {
          this.deleteInquiryStatusHandler.emit(inquiryStatus.id);
        }
      });
  }

  manageInquiryStatus(inquiryStatus: InquiryStatus | null): void {
    const dialogRef = this.dialog.open(ManageInquiryStatusComponent, {
      width: '400px',
      direction: this.langDir,
      data: Object.assign({}, inquiryStatus)
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const statusIndex = this.inquiryStatuses.findIndex(c => c.id === result.id);
        if (statusIndex > -1) {
          const updatedStatuses = [...this.inquiryStatuses];
          updatedStatuses[statusIndex] = result;
          this.inquiryStatuses = updatedStatuses;
        } else {
          this.inquiryStatuses = [...this.inquiryStatuses, result];
        }
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.inquiryStatuses.indexOf(row);
  }
}
