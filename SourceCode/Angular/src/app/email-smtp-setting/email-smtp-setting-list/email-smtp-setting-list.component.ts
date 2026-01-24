import { Component, OnInit } from '@angular/core';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';
import { ToastrService } from '@core/services/toastr.service';
import { EmailSmtpSettingService } from '../email-smtp-setting.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-email-smtp-setting-list',
  templateUrl: './email-smtp-setting-list.component.html',
  styleUrls: ['./email-smtp-setting-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    HasClaimDirective,
    MatTableModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    NgClass
  ]
})
export class EmailSmtpSettingListComponent extends BaseComponent implements OnInit {
  emailSMTPSettings: EmailSMTPSetting[] = [];
  displayedColumns: string[] = ['action', 'userName', 'host', 'port', 'isDefault'];

  constructor(private emailSmtpSettingService: EmailSmtpSettingService,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getEmailSMTPSettings();
  }

  getEmailSMTPSettings() {
    this.sub$.sink = this.emailSmtpSettingService.getEmailSMTPSettings().subscribe((settings: EmailSMTPSetting[]) => {
      this.emailSMTPSettings = settings;
    })
  }

  deleteEmailSMTPSetting(setting: EmailSMTPSetting) {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(`${areU} ${setting.host}`)
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.emailSmtpSettingService.deleteEmailSMTPSetting(setting.id ?? '').subscribe(() => {
            this.toastrService.success(this.translationService.getValue('EMAIL_SMTP_SETTING_DELETED_SUCCESSFULLY'));
            this.getEmailSMTPSettings();
          });
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.emailSMTPSettings.indexOf(row);
  }
}
