import { Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { EmailLogAttachments } from '@core/domain-classes/email-log-attachments';
import { EmailLogs } from '@core/domain-classes/email-logs';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { EmailLogService } from '../email-log.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { TranslateModule } from '@ngx-translate/core';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-email-log-details',
  imports: [
    TranslateModule,
    UTCToLocalTime,
    MatIconModule,
    MatDialogModule,
    TextEditorComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './email-log-details.component.html',
  styleUrl: './email-log-details.component.scss'
})
export class EmailLogDetailsComponent {
  body: FormControl = new FormControl();
  constructor(@Inject(MAT_DIALOG_DATA) public data: EmailLogs,
    private dialogRef: MatDialogRef<EmailLogDetailsComponent>,
    private emailLogService: EmailLogService,
    private toastrService: ToastrService,
    private translationService: TranslationService) {
    this.body.setValue(data.body);
  }

  close() {
    this.dialogRef.close();
  }


  downloadAttachment(attachment: EmailLogAttachments) {
    this.emailLogService.downloadAttachment(attachment.id ?? '')
      .subscribe(
        (event) => {
          if (event.type === HttpEventType.Response) {
            this.downloadFile(event, attachment.name);
          }
        },
        (error) => {
          this.toastrService.error(this.translationService.getValue('ERROR_WHILE_DOWNLOADING_DOCUMENT'));
        }
      );
  }

  private downloadFile(data: HttpResponse<Blob>, name: string) {
    const downloadedFile = new Blob([data.body ?? ''], { type: data.body?.type });
    const a = document.createElement('a');
    a.setAttribute('style', 'display:none;');
    document.body.appendChild(a);
    a.download = name;
    a.href = URL.createObjectURL(downloadedFile);
    a.target = '_blank';
    a.click();
    document.body.removeChild(a);
  }
}
