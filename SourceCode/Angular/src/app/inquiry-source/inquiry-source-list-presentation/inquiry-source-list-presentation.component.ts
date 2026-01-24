import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { InquirySource } from '@core/domain-classes/inquiry-source';
import { ManageInquirySourceComponent } from '../manage-inquiry-source/manage-inquiry-source.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-inquiry-source-list-presentation',
  templateUrl: './inquiry-source-list-presentation.component.html',
  styleUrls: ['./inquiry-source-list-presentation.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    HasClaimDirective,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    NgClass
  ]
})
export class InquirySourceListPresentationComponent extends BaseComponent implements OnInit {

  @Input() inquirySources!: InquirySource[];
  @Output() deleteInquirySourceHandler: EventEmitter<string> = new EventEmitter<string>();
  displayedColumns: string[] = ['action', 'name'];
  constructor(
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
  }

  deleteInquirySource(inquirySource: InquirySource): void {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService.deleteConformationDialog(`${areU} :: ${inquirySource.name}`)
      .subscribe(isTrue => {
        if (isTrue) {
          this.deleteInquirySourceHandler.emit(inquirySource.id);
        }
      });
  }

  manageInquirySource(inquirySource: InquirySource | null): void {
    const dialogRef = this.dialog.open(ManageInquirySourceComponent, {
      width: '400px',
      direction: this.langDir,
      data: Object.assign({}, inquirySource)
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result: InquirySource) => {
      if (result) {
        const inquirySourceIndex = this.inquirySources.findIndex(c => c.id === result.id);
        if (inquirySourceIndex > -1) {
          const updatedInquirySources = [...this.inquirySources];
          updatedInquirySources[inquirySourceIndex] = result;
          this.inquirySources = updatedInquirySources;
        } else {
          this.inquirySources = [...this.inquirySources, result];
        }
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.inquirySources.indexOf(row);
  }
}
