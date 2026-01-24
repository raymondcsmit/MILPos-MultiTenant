import { Component, OnInit } from '@angular/core';
import { LanguagesService } from '../languages.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { ToastrService } from '@core/services/toastr.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-manage-language',
  templateUrl: './manage-language.component.html',
  styleUrls: ['./manage-language.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatCardModule,
    RouterModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class ManageLanguageComponent extends BaseComponent implements OnInit {
  selectedLanguage: any;
  defaultLanguage: any;
  fields: any[] = [];
  languageForm!: FormGroup;
  languageImgSrc: any = null;
  isLanguageImageUpload = false;
  constructor(
    private languagesService: LanguagesService,
    private route: ActivatedRoute,
    private toastrService: ToastrService,
    private router: Router
  ) {
    super();
  }

  ngOnInit(): void {
    this.getLanguageFromRoute();
  }

  getLanguageFromRoute() {
    this.route.data.subscribe((data: any) => {
      if (data.language) {
        if (data.language?.imageUrl) {
          this.languageImgSrc = `${environment.apiUrl}${data.language.imageUrl}`;
        }
        this.selectedLanguage = data.language;
      }
      this.getDefaultLanguage();
    });
  }

  getDefaultLanguage() {
    this.languagesService.getDefaultLanguage().subscribe((data) => {
      this.defaultLanguage = data;
      let formGroupFields: { [key: string]: FormControl } = {
        languageName: new FormControl(
          this.selectedLanguage?.name,
          [Validators.required]
        ),
        isrtl: new FormControl(
          this.selectedLanguage?.isrtl ?? false
        ),
        id: new FormControl(this.selectedLanguage?.id ?? ''),

      };

      Object.keys(data).forEach((field: string) => {
        formGroupFields[field] = new FormControl('', [Validators.required]);
        this.fields.push(field);
      });
      this.languageForm = new FormGroup(formGroupFields);
      if (this.selectedLanguage) {
        this.languageForm.patchValue(JSON.parse(this.selectedLanguage.codes));
      } else {
        this.languageForm.patchValue(this.defaultLanguage);
      }
    });
  }

  onProductImageSelect($event: any) {
    const fileSelected = $event.target.files[0];
    if (!fileSelected) {
      return;
    }
    const mimeType = fileSelected.type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(fileSelected);
    // tslint:disable-next-line: variable-name
    reader.onload = (_event) => {
      this.languageImgSrc = reader.result;
      this.isLanguageImageUpload = true;
      $event.target.value = '';
    };
  }

  onLanguageSubmit() {
    if (this.languageForm.invalid) {
      this.toastrService.error(
        this.translationService.getValue('PLEASE_ENTER_PROPER_DATA')
      );
      this.languageForm.markAllAsTouched();
      return;
    }

    if (!this.selectedLanguage && !this.isLanguageImageUpload) {
      this.toastrService.error(this.translationService.getValue('ADD_IMAGE'));
      return;
    }

    let language: { [key: string]: any } = {};
    language['name'] = this.languageForm.get('languageName')?.value;
    language['id'] = this.languageForm.get('id')?.value;
    language['order'] = this.languageForm.get('order')?.value;
    language['code'] = this.languageForm.get('LANGUAGE')?.value;
    language['isrtl'] = this.languageForm.get('isrtl')?.value;
    language['isLanguageImageUpload'] = this.isLanguageImageUpload;
    if (this.isLanguageImageUpload) {
      language['languageImgSrc'] = this.languageImgSrc;
    }
    let codes: { [key: string]: any } = {};
    Object.keys(this.defaultLanguage).forEach((field) => {
      try {
        codes[field] = this.languageForm.get(field)?.value;
      } catch (error) {
        console.error(field);
      }
    });
    language['codes'] = JSON.stringify(codes);
    if (this.selectedLanguage) {
      language['id'] = this.selectedLanguage.id;
      this.languagesService.updateLanguages(language).subscribe((data) => {
        this.toastrService.success(
          this.translationService.getValue('LANGUAGE_UPDATED_SUCCESSFULLY')
        );
        this.router.navigate(['/languages']);
      });
    } else {
      this.languagesService.saveLanguages(language).subscribe((data) => {
        this.toastrService.success(
          this.translationService.getValue('LANGUAGE_SAVED_SUCCESSFULLY')
        );
        this.router.navigate(['/languages']);
      });
    }
  }
}
