import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';
import { ToastrService } from '@core/services/toastr.service';
import { EmailSmtpSettingService } from '../email-smtp-setting.service';
import { CommonService } from '@core/services/common.service';
import { MatDialog } from '@angular/material/dialog';
import { TestSmtpSettingComponent } from '../test-smtp-setting/test-smtp-setting.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-manage-email-smtp-setting',
  templateUrl: './manage-email-smtp-setting.component.html',
  styleUrls: ['./manage-email-smtp-setting.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatSlideToggleModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class ManageEmailSmtpSettingComponent extends BaseComponent implements OnInit {
  isEditMode: boolean = false;
  smtpSettingForm!: UntypedFormGroup;
  smtpConfigured: boolean = false;

  constructor(
    private router: Router,
    private fb: UntypedFormBuilder,
    private activeRoute: ActivatedRoute,
    private emailSmtpSettingService: EmailSmtpSettingService,
    private toastrService: ToastrService,
    private commonService: CommonService,
    private matDialog: MatDialog
  ) {
    super();
  }

  ngOnInit(): void {
    this.createEmailSMTPForm();
    this.sub$.sink = this.activeRoute.data.subscribe(
      (data: any) => {
        if (data.smtpSetting) {
          this.isEditMode = true;
          this.smtpSettingForm.patchValue(data.smtpSetting);
        }
      });

  }

  createEmailSMTPForm() {
    this.smtpSettingForm = this.fb.group({
      id: [''],
      host: ['', [Validators.required]],
      userName: ['', [Validators.required]],
      password: ['', [Validators.required]],
      port: ['', [Validators.required]],
      isDefault: [false],
      encryptionType: [''],
      fromEmail: ['', [Validators.email, Validators.required]],
      fromName: ['', [Validators.required]],
    });
  }

  saveEmailSMTPSetting() {
    if (this.smtpSettingForm.valid) {
      const emailSMTPSetting = this.createBuildObject();
      if (this.isEditMode) {
        this.sub$.sink = this.emailSmtpSettingService.updateEmailSMTPSetting(emailSMTPSetting).subscribe(() => {
          this.toastrService.success(this.translationService.getValue('EMAIL_SMTP_SETTING_UPDATED_SUCCESSFULLY'));
          this.router.navigate(['/email-smtp']);
        });
      } else {
        this.sub$.sink = this.emailSmtpSettingService.addEmailSMTPSetting(emailSMTPSetting).subscribe(() => {
          this.toastrService.success(this.translationService.getValue('EMAIL_SMTP_SETTING_CREATED_SUCCESSFULLY'));
          this.router.navigate(['/email-smtp']);
        });
      }
    } else {
      this.smtpSettingForm.markAllAsTouched();
    }
  }

  createBuildObject(): EmailSMTPSetting {
    const id = this.smtpSettingForm.get('id')?.value;
    const smgtpSettings: EmailSMTPSetting = {
      id: id,
      host: this.smtpSettingForm.get('host')?.value,
      userName: this.smtpSettingForm.get('userName')?.value,
      password: this.smtpSettingForm.get('password')?.value,
      encryptionType: this.smtpSettingForm.get('encryptionType')?.value,
      port: this.smtpSettingForm.get('port')?.value,
      isDefault: this.smtpSettingForm.get('isDefault')?.value,
      fromEmail: this.smtpSettingForm.get('fromEmail')?.value,
      fromName: this.smtpSettingForm.get('fromName')?.value
    }
    return smgtpSettings;
  }

  testEmailSMTPSetting() {
    if (this.smtpSettingForm.valid) {
      const emailSMTPSetting = this.createBuildObject();
      this.matDialog.open(TestSmtpSettingComponent, {
        data: emailSMTPSetting,
        width: '400px'
      });
    } else {
      this.smtpSettingForm.markAllAsTouched();
    }
  }
}
