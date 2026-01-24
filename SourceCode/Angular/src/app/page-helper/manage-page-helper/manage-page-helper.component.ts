import { Component, OnInit } from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from '@core/services/toastr.service';
import { PageHelperService } from '../page-helper.service';
import { PageHelper } from '@core/domain-classes/page-helper';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { TextEditorComponent } from '@shared/text-editor/text-editor.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manage-page-helper',
  templateUrl: './manage-page-helper.component.html',
  styleUrls: ['./manage-page-helper.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    RouterModule,
    TextEditorComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class ManagePageHelperComponent extends BaseComponent implements OnInit {
  pageHelper!: PageHelper;
  pageHelperForm!: UntypedFormGroup;

  constructor(
    private fb: UntypedFormBuilder,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private pageHelperService: PageHelperService,
    private toastrService: ToastrService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.createPageHelperForm();
    this.sub$.sink = this.activeRoute.data.subscribe(
      (data: any) => {
        if (data.pageHelper) {
          this.pageHelperForm.patchValue(data.pageHelper);
          this.pageHelper = data.pageHelper;
        }
      }
    );
  }

  createPageHelperForm() {
    this.pageHelperForm = this.fb.group({
      id: [''],
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
    });
  }

  createBuildObject(): PageHelper {
    const pageHelper: PageHelper = {
      id: this.pageHelperForm.get('id')?.value,
      name: this.pageHelperForm.get('name')?.value,
      description: this.pageHelperForm.get('description')?.value,
    };
    return pageHelper;
  }

  update() {
    if (this.pageHelperForm.valid) {
      const pageHelper = this.createBuildObject();
      this.sub$.sink = this.pageHelperService
        .updatePageHelper(pageHelper)
        .subscribe(() => {
          this.toastrService.success(
            this.translationService.getValue('PAGE_HELPER_UPDATED_SUCCESSFULLY')
          );
          this.router.navigate(['/page-helper']);
        });
    } else {
      this.pageHelperForm.markAllAsTouched();
      this.toastrService.error(
        this.translationService.getValue('PLEASE_ENTER_PROPER_DATA')
      );
    }
  }
}
