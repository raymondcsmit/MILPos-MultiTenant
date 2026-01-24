import { Component, OnInit } from '@angular/core';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { EmailTemplate } from '@core/domain-classes/email-template';
import { CommonError } from '@core/error-handler/common-error';
import { ToastrService } from '@core/services/toastr.service';
import { EmailTemplateService } from '../email-template.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-email-template-list',
  templateUrl: './email-template-list.component.html',
  styleUrls: ['./email-template-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    HasClaimDirective,
    MatTableModule,
    RouterModule,
    HasClaimDirective,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass
  ]
})
export class EmailTemplateListComponent extends BaseComponent implements OnInit {

  emailTemplates: EmailTemplate[] = [];
  displayedColumns: string[] = ['action', 'name', 'subject'];
  constructor(
    private emailTemplateService: EmailTemplateService,
    private toastrService: ToastrService,
    private commonDialogService: CommonDialogService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getEmailTemplates();
  }

  delteEmailTemplate(emailTemplate: EmailTemplate) {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${areU}:: ${emailTemplate.name}`)
      .subscribe((flag: boolean) => {
        if (flag) {
          this.sub$.sink = this.emailTemplateService.deleteEmailTemplate(emailTemplate)
            .subscribe(() => {
              this.toastrService.success(this.translationService.getValue('EMAIL_TEMPLATE_DELETED_SUCCESSFULLY'));
              this.getEmailTemplates();
            });
        }
      });
  }

  getEmailTemplates(): void {
    this.sub$.sink = this.emailTemplateService.getEmailTemplates()
      .subscribe((data: EmailTemplate[]) => {
        this.emailTemplates = data;
      }, (err: CommonError) => {
        err.messages.forEach(msg => {
          this.toastrService.error(msg)
        });
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.emailTemplates.indexOf(row);
  }
}
