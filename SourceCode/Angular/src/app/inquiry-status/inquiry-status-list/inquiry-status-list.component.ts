import { Component, OnInit } from '@angular/core';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';
import { InquiryStatusService } from '@core/services/inquiry-status.service';
import { ToastrService } from '@core/services/toastr.service';
import { InquiryStatusListPresentationComponent } from '../inquiry-status-list-presentation/inquiry-status-list-presentation.component';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-inquiry-status-list',
  templateUrl: './inquiry-status-list.component.html',
  styleUrls: ['./inquiry-status-list.component.scss'],
  standalone: true,
  imports: [
    InquiryStatusListPresentationComponent
  ]
})
export class InquiryStatusListComponent extends BaseComponent implements OnInit {
  inquiryStatuses: InquiryStatus[] = [];
  constructor(
    private inquiryStatusService: InquiryStatusService,
    private toastrService: ToastrService) {
    super();
  }
  ngOnInit(): void {
    this.getInquiryStatuses();
  }

  getInquiryStatuses(): void {
    this.inquiryStatusService.getAll().subscribe(c => {
      this.inquiryStatuses = c;
    });
  }

  deleteInquiryStatus(id: string): void {
    this.sub$.sink = this.inquiryStatusService.delete(id).subscribe(() => {
      this.toastrService.success(this.translationService.getValue('INQUIRY_STATUS_DELETED_SUCCESSFULLY'));
      this.getInquiryStatuses();
    });
  }

}
