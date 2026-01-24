import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageHelper } from '@core/domain-classes/page-helper';
import { CommonService } from '@core/services/common.service';
import { PageHelpPreviewComponent } from '@shared/page-help-preview/page-help-preview.component';
import { BaseComponent } from '../../base.component';
import { ToastrService } from '@core/services/toastr.service';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-page-help-text',
  templateUrl: './page-help-text.component.html',
  styleUrls: ['./page-help-text.component.scss'],
  standalone: true,
  imports: [
    MatIconModule
  ]
})
export class PageHelpTextComponent extends BaseComponent implements OnInit {
  constructor(
    private commonService: CommonService,
    private dialog: MatDialog,
    private toastrService: ToastrService
  ) {
    super();
  }
  pageHelpText!: PageHelper;
  @Input() code = '';
  ngOnInit(): void { }

  viewPageHelp() {
    // const pageHelpText=;
    this.commonService
      .getPageHelperText(this.code)
      .subscribe((help: PageHelper) => {
        if (help) {
          this.dialog.open(PageHelpPreviewComponent, {
            maxWidth: '70vw',
            width: '100%',
            maxHeight: '80vh',
            data: Object.assign({}, help),
          });
        } else {
          this.toastrService.error(
            this.translationService.getValue('NO_HELP_TEXT_FOUND')
          );
        }
      });
  }
}
