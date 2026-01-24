import { Component, OnInit } from '@angular/core';
import { InquirySource } from '@core/domain-classes/inquiry-source';
import { InquirySourceService } from '@core/services/inquiry-source.service';
import { ToastrService } from '@core/services/toastr.service';
import { InquirySourceListPresentationComponent } from '../inquiry-source-list-presentation/inquiry-source-list-presentation.component';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-inquiry-source-list',
  templateUrl: './inquiry-source-list.component.html',
  styleUrls: ['./inquiry-source-list.component.scss'],
  standalone: true,
  imports: [
    InquirySourceListPresentationComponent
  ]
})
export class InquirySourceListComponent extends BaseComponent implements OnInit {
  inquirySources: InquirySource[] = [];
  constructor(
    private inquirySourcesService: InquirySourceService,
    private toastrService: ToastrService) {
    super();

  }
  ngOnInit(): void {
    this.getInquirySources();

  }

  getInquirySources(): void {
    this.inquirySourcesService.getAll().subscribe(c => {
      this.inquirySources = c;
    });
  }

  deleteInquirySource(id: string): void {
    this.sub$.sink = this.inquirySourcesService.delete(id).subscribe(() => {
      this.toastrService.success(this.translationService.getValue('INQUIRY_SOURCE_DELETED_SUCCESSFULLY'));
      this.getInquirySources();
    });
  }
}
