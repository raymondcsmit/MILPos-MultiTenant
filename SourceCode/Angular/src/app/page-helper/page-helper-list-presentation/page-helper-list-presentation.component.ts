import { Component, Input, OnInit } from '@angular/core';
import { PageHelper } from '@core/domain-classes/page-helper';
import { Router } from '@angular/router';
import { PageHelpPreviewComponent } from '@shared/page-help-preview/page-help-preview.component';
import { CommonService } from '@core/services/common.service';
import { MatDialog } from '@angular/material/dialog';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-page-helper-list-presentation',
  templateUrl: './page-helper-list-presentation.component.html',
  styleUrls: ['./page-helper-list-presentation.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass
  ],
})
export class PageHelperListPresentationComponent
  extends BaseComponent
  implements OnInit {
  @Input() pageHelpers: PageHelper[] = [];
  columnsToDisplay: string[] = ['action', 'name', 'code'];

  constructor(
    private router: Router,
    private commonService: CommonService,
    private dialog: MatDialog
  ) {
    super();
  }

  ngOnInit(): void { }

  viewPageHelper(pageHelper: PageHelper): void {
    this.commonService
      .getPageHelperText(pageHelper.code ?? '')
      .subscribe((help: PageHelper) => {
        this.dialog.open(PageHelpPreviewComponent, {
          width: '100%',
          maxWidth: '70vw',
          data: Object.assign({}, help),
        });
      });
  }

  managePageHelper(pageHelper: PageHelper) {
    this.router.navigate(['/page-helper/manage', pageHelper.id]);
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.pageHelpers.indexOf(row);
  }
}
