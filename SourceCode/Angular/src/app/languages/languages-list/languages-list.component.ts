import { Component, OnInit } from '@angular/core';
import { LanguagesService } from '../languages.service';
import { environment } from '@environments/environment';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-languages-list',
  templateUrl: './languages-list.component.html',
  styleUrls: ['./languages-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    RouterModule,
    TranslateModule,
    MatTableModule,
    HasClaimDirective,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    NgClass
  ]
})
export class LanguagesListComponent extends BaseComponent implements OnInit {
  languages: any[] = [];
  displayedColumns: string[] = ['action', 'imageUrl', 'name', 'code', 'order'];
  constructor(
    private languagesService: LanguagesService,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.getLanguages();
  }

  getLanguages() {
    this.languagesService.getLanguages().subscribe(
      (lan) => {
        this.languages = lan;
        this.languages.forEach((lan) => {
          lan.imageUrl = `${environment.apiUrl}${lan.imageUrl}`;
        });
      });
  }

  deleteLanguage(language: any) {
    this.commonDialogService
      .deleteConformationDialog(
        `${this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
        )}?`
      )
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.languagesService
            .deleteLanguages(language.id)
            .subscribe(() => {
              this.toastrService.success(
                this.translationService.getValue(
                  'LANGUAGE_DELETED_SUCCESSFULLY'
                )
              );
              this.getLanguages();
            });
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.languages.indexOf(row);
  }
}
