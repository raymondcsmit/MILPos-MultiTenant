import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { NLog } from '@core/domain-classes/n-log';
import { NLogResource } from '@core/domain-classes/n-log-resource';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { fromEvent, merge, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { NLogDataSource } from '../n-log-datasource';
import { NLogService } from '../n-log.service';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { RouterModule } from '@angular/router';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe, NgClass } from '@angular/common';

@Component({
  selector: 'app-n-log-list',
  templateUrl: './n-log-list.component.html',
  styleUrls: ['./n-log-list.component.scss'],
  standalone: true,
  imports: [
    MatTableModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatPaginatorModule,
    MatSelectModule,
    TranslateModule,
    RouterModule,
    TruncatePipe,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    DatePipe,
    NgClass
  ]
})
export class NLogListComponent extends BaseComponent implements OnInit, AfterViewInit {
  dataSource!: NLogDataSource;
  logs: NLog[] = [];
  levels = ['Fatal', 'Error', 'Warn', 'Info', 'Debug', 'Trace'];
  sources = ['.Net Core', 'Angular'];
  displayedColumns: string[] = ['action', 'logged', 'level', 'message', 'source'];
  footerToDisplayed = ['footer'];
  isLoadingResults = true;
  nLogResource: NLogResource;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('input') input!: ElementRef;
  constructor(private nLogService: NLogService) {
    super();
    this.getLangDir();
    this.nLogResource = new NLogResource();
    this.nLogResource.pageSize = 10;
    this.nLogResource.orderBy = 'logged desc';
    this.nLogResource.level = 'Error';
    this.nLogResource.source = '';
  }

  ngOnInit(): void {
    this.dataSource = new NLogDataSource(this.nLogService);
    this.dataSource.loadNLogs(this.nLogResource);
    this.getResourceParameter();

    this.dataSource.connect().subscribe((logs) => {
      this.logs = logs;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.nLogResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.nLogResource.pageSize = this.paginator.pageSize;
          this.nLogResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadNLogs(this.nLogResource);
        })
      )
      .subscribe();

    this.sub$.sink = fromEvent(this.input.nativeElement, 'keyup')
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        tap(() => {
          this.paginator.pageIndex = 0;
          this.nLogResource.message = this.input.nativeElement.value;
          this.dataSource.loadNLogs(this.nLogResource);
        })
      )
      .subscribe();
  }

  onLevelChange(filtervalue: any) {
    if (filtervalue.value) {
      this.nLogResource.level = filtervalue.value;
    } else {
      this.nLogResource.level = '';
    }
    this.nLogResource.skip = 0;
    this.dataSource.loadNLogs(this.nLogResource);
  }

  onSourceChange(filtervalue: any) {
    if (filtervalue.value) {
      this.nLogResource.source = filtervalue.value;
    } else {
      this.nLogResource.source = '';
    }
    this.nLogResource.skip = 0;
    this.dataSource.loadNLogs(this.nLogResource);
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.nLogResource.pageSize = c.pageSize;
          this.nLogResource.skip = c.skip;
          this.nLogResource.totalCount = c.totalCount;
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.logs.indexOf(row);
  }
}
