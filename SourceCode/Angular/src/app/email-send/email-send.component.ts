import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  FormArray,
  FormBuilder,

  Validators,
} from '@angular/forms';
import { EmailParameter } from '@core/domain-classes/email-parameter';
import { EmailTemplate } from '@core/domain-classes/email-template';
import { FileInfo } from '@core/domain-classes/file-info';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../base.component';
import { EmailTemplateService } from '../email-template/email-template.service';
import { EmailSendService } from './email-send.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { DragDropDirective } from '@shared/directives/drag-drop.directive';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-email-send',
  templateUrl: './email-send.component.html',
  styleUrls: ['./email-send.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatSelectModule,
    ReactiveFormsModule,
    TextEditorComponent,
    DragDropDirective,
    FormsModule,
    HasClaimDirective,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class EmailSendComponent extends BaseComponent implements OnInit {
  emailTamplates: EmailTemplate[] = [];
  selectedEmailTamplate!: EmailTemplate;
  emailForm!: FormGroup;
  files: any = [];
  fileData: FileInfo[] = [];
  extension: string = '';
  fileType: string = '';
  constructor(
    private fb: FormBuilder,
    private emailTemplateService: EmailTemplateService,
    private toastrService: ToastrService,
    private emailSendService: EmailSendService,
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createEmailForm();
    this.getEmailTamplate();
  }

  onTempateChange() {
    this.parameters.clear();
    this.emailForm.patchValue(this.selectedEmailTamplate);
    const regex = /\##(.*?)\##/gi;
    const parameters: any =
      this.selectedEmailTamplate?.body?.match(regex);
    if (parameters) {
      [...new Set(parameters)].forEach((parameter) => {
        this.parameters.push(this.newParameter(parameter));
      });
    }
  }

  newParameter(parameter: any): FormGroup {
    return this.fb.group({
      parameter: [parameter, [Validators.required]],
      value: ['', [Validators.required]],
    });
  }

  get parameters(): FormArray {
    return <FormArray>this.emailForm.get('parameters');
  }

  setParameterValue() {
    const paramters: EmailParameter[] = this.parameters.value;
    let emailBody = this.selectedEmailTamplate.body;
    if (paramters) {
      paramters.forEach((paramter) => {
        if (paramter.value) {
          emailBody = emailBody?.split(paramter.parameter).join(paramter.value);
        }
      });
      this.emailForm.get('body')?.setValue(emailBody);
    }
  }

  getEmailTamplate() {
    this.sub$.sink = this.emailTemplateService
      .getEmailTemplates()
      .subscribe((emailTamplats: EmailTemplate[]) => {
        this.emailTamplates = emailTamplats;
      });
  }

  createEmailForm() {
    this.emailForm = this.fb.group({
      id: [''],
      toAddress: ['', [Validators.required]],
      cCAddress: [''],
      subject: ['', [Validators.required]],
      body: ['', [Validators.required]],
      parameters: this.fb.array([]),
    });
  }

  fileBrowseHandler(files: any) {
    for (let file of files) {
      this.files.push(file);
    }
    this.getFileInfo();
  }

  getFileInfo() {
    this.fileData = [];
    for (let i = 0; i < this.files.length; i++) {
      const reader = new FileReader();
      this.extension = this.files[i].name.split('.').pop().toLowerCase();
      this.fileType = this.files[i].type;
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        const fileInfo = new FileInfo();
        fileInfo.src = ev.target?.result?.toString();
        fileInfo.extension = this.extension;
        fileInfo.name = this.files[i].name;
        fileInfo.fileType = this.fileType;
        this.fileData.push(fileInfo);
      };
      reader.readAsDataURL(this.files[i]);
    }
  }

  sendEmail() {
    if (!this.emailForm.valid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    const emailObj = this.emailForm.value;
    emailObj.attechments = this.fileData;
    this.emailSendService.sendEmail(emailObj).subscribe(
      () => {
        this.toastrService.success(
          this.translationService.getValue('EMAIL_SENT_SUCCESSFULLY')
        );
        this.clearForm();
      });
  }

  clearForm() {
    this.parameters.clear();
    this.files = [];
    this.selectedEmailTamplate = {
      name: '',
      id: '',
      body: '',
      subject: '',
    };
    this.emailForm.patchValue({
      id: [''],
      toAddress: [''],
      cCAddress: [''],
      subject: [''],
    });
    this.emailForm.get('body')?.setValue('');
  }

  formatBytes(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return 'n/a';
    const value = Math.floor(Math.log(bytes) / Math.log(1024));
    const i = parseInt(value.toString(), 10);
    if (i === 0) return `${bytes} ${sizes[i]})`;
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
  }

  onDeleteFile(index: number) {
    this.files.splice(index, 1);
    this.fileData.splice(index, 1);
  }

  onFileDropped($event: any) {
    for (let file of $event) {
      this.files.push(file);
    }
    this.getFileInfo();
  }
}
