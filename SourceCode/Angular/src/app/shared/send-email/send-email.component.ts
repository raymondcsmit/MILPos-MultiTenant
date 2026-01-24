import { Component, Inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from '@core/services/toastr.service';
import { EmailSendService } from './email-send.service';
import { Subscription } from 'rxjs';
import { SendEmailRequest } from './send-email-request';
import { TranslateModule } from '@ngx-translate/core';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { MatIconModule } from '@angular/material/icon';
import { EmailSMTPSetting } from '@core/domain-classes/email-smtp-setting';
import { MatButtonModule } from '@angular/material/button';
import { BaseComponent } from '../../base.component';
import { EmailSmtpSettingService } from '../../email-smtp-setting/email-smtp-setting.service';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-send-email',
  templateUrl: './send-email.component.html',
  styleUrls: ['./send-email.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    TranslateModule,
    TextEditorComponent
  ]
})
export class SendEmailComponent extends BaseComponent implements OnInit {
  emailForm!: UntypedFormGroup;
  subscriptions = new Subscription();
  isLoading = false;
  smtpConfigured: boolean = true;
  constructor(
    private fb: UntypedFormBuilder,
    private toastrService: ToastrService,
    private emailSendService: EmailSendService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<SendEmailComponent>,
    private emailSmtpSettingService: EmailSmtpSettingService
  ) {
    super();
  }

  ngOnInit(): void {
    this.getEmailSMTPSettings();
    this.createEmailForm();
  }

  getEmailSMTPSettings() {
    this.emailSmtpSettingService.getEmailSMTPSettings().subscribe((settings: EmailSMTPSetting[]) => {
      if (settings && settings.length > 0) {
        this.smtpConfigured = true;
      } else {
        this.smtpConfigured = false;
      }
    })
  }

  closeDialog() {
    this.dialogRef.close();
  }

  createEmailForm() {
    this.emailForm = this.fb.group({
      id: [''],
      toAddress: ['', [Validators.required, Validators.email]],
      subject: [this.data.subject, [Validators.required]],
      body: [this.data.subject, [Validators.required]],
    });
  }

  sendEmail() {
    if (!this.emailForm.valid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.emailSendService
      .sendEmailSalesOrPurchase(this.buildObject())
      .subscribe({
        next: () => {
          this.toastrService.success(
            this.translationService.getValue('EMAIL_SENT_SUCCESSFULLY')
          );
          this.isLoading = false;
          this.dialogRef.close();
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  buildObject() {
    const sendEmail: SendEmailRequest = {
      toAddress: this.emailForm.get('toAddress')?.value,
      subject: this.emailForm.get('subject')?.value,
      message: this.emailForm.get('body')?.value,
      attachement: this.data.blob,
      name: this.data.name,
      fileType: this.data.contentType,
    };
    return sendEmail;
  }
}
