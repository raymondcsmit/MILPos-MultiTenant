import { Component, OnInit } from '@angular/core';
import { ToastrService } from '@core/services/toastr.service';
import { Page } from '@core/domain-classes/page';
import { PageService } from '@core/services/page.service';
import { PageListPresentationComponent } from '../page-list-presentation/page-list-presentation.component';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-page-list',
  templateUrl: './page-list.component.html',
  styleUrls: ['./page-list.component.scss'],
  standalone: true,
  imports: [
    PageListPresentationComponent,
  ]
})
export class PageListComponent extends BaseComponent implements OnInit {
  pages: Page[] = [];
  displayedColumns: string[] = ['action', 'name'];

  constructor(
    private pageService: PageService,
    private toastrServoce: ToastrService) {
    super();
  }

  ngOnInit(): void {
    this.getPages();
  }

  deletePage(pageId: string) {
    this.sub$.sink = this.pageService.delete(pageId ?? '').subscribe(() => {
      this.toastrServoce.success(this.translationService.getValue('PAGE_DELETED_SUCCESSFULLY'));
    })
  }

  getPages(): void {
    this.pageService.getAll().subscribe((c: Page[]) => {
      this.pages = c;
    });
  }
}
