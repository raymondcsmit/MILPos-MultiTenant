import { Component, OnInit } from '@angular/core';
import { PageHelperService } from '../page-helper.service';
import { PageHelper } from '@core/domain-classes/page-helper';
import { PageHelperListPresentationComponent } from '../page-helper-list-presentation/page-helper-list-presentation.component';
import { AsyncPipe } from '@angular/common';
import { BaseComponent } from '../../base.component';

@Component({
  selector: 'app-page-helper-list',
  templateUrl: './page-helper-list.component.html',
  styleUrls: ['./page-helper-list.component.scss'],
  standalone: true,
  imports: [
    PageHelperListPresentationComponent,
  ]
})
export class PageHelperListComponent extends BaseComponent implements OnInit {
  pageHelpers: PageHelper[] = [];

  constructor(private pageHelperService: PageHelperService) {
    super();
  }
  ngOnInit(): void {
    this.getPageHelpers();
  }

  getPageHelpers(): void {
    this.pageHelperService
      .getPageHelpers()
      .subscribe((pageHelpers: PageHelper[]) => {
        this.pageHelpers = pageHelpers;
      });
  }
}
