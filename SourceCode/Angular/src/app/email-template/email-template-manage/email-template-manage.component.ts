import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmailTemplate } from '@core/domain-classes/email-template';
import { ToastrService } from '@core/services/toastr.service';
import { EmailTemplateService } from '../email-template.service';
import { TranslateModule } from '@ngx-translate/core';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { BaseComponent } from '../../base.component';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-email-template-manage',
  templateUrl: './email-template-manage.component.html',
  styleUrls: ['./email-template-manage.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    PageHelpTextComponent,
    RouterModule,
    TextEditorComponent,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class EmailTemplateManageComponent
  extends BaseComponent
  implements OnInit {
  emailTemplateForm!: FormGroup;
  emailTemplate!: EmailTemplate;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private emailTemplateService: EmailTemplateService,
    private router: Router,
    private toastrService: ToastrService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.createEmailTemplateForm();
    this.getEmailResolverData();
  }

  getEmailResolverData() {
    this.sub$.sink = this.route.data.subscribe(
      (data: any) => {
        if (data.emailTemplate) {
          this.emailTemplate = data.emailTemplate;
          this.patchEmailTemplateData();
        }
      }
    );
  }

  addUpdateEmailTemplate() {
    if (this.emailTemplateForm.valid) {
      if (this.emailTemplate) {
        this.sub$.sink = this.emailTemplateService
          .updateEmailTemplate(this.createBuildObject())
          .subscribe((c) => {
            this.toastrService.success(
              this.translationService.getValue(
                'EMAIL_TEMPLATE_SAVE_SUCCESSFULLY'
              )
            );
            this.router.navigate(['/emailtemplate']);
          });
      } else {
        this.sub$.sink = this.emailTemplateService
          .addEmailTemplate(this.createBuildObject())
          .subscribe((c) => {
            this.toastrService.success(
              this.translationService.getValue(
                'EMAIL_TEMPLATE_SAVE_SUCCESSFULLY'
              )
            );
            this.router.navigate(['/emailtemplate']);
          });
      }
    } else {
      for (let inner in this.emailTemplateForm.controls) {
        this.emailTemplateForm.get(inner)?.markAsDirty();
        this.emailTemplateForm.get(inner)?.updateValueAndValidity();
      }
    }
  }

  createBuildObject(): EmailTemplate {
    const emailTemplate: EmailTemplate = {
      id: this.emailTemplate ? this.emailTemplate.id : '',
      name: this.emailTemplateForm.get('name')?.value,
      subject: this.emailTemplateForm.get('subject')?.value,
      body: this.emailTemplateForm.get('body')?.value,
    };
    return emailTemplate;
  }

  createEmailTemplateForm() {
    this.emailTemplateForm = this.fb.group({
      name: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      body: ['', [Validators.required]],
    });
  }

  patchEmailTemplateData() {
    this.emailTemplateForm.patchValue({
      name: this.emailTemplate.name,
      subject: this.emailTemplate.subject,
      body: this.emailTemplate.body,
    });
  }
}
