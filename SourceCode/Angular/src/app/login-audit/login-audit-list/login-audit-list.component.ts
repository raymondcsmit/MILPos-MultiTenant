import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { LoginAudit } from '@core/domain-classes/login-audit';
import { LoginAuditResource } from '@core/domain-classes/login-audit-resource';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { fromEvent, merge, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { LoginAuditDataSource } from '../login-audit-datasource';
import { LoginAuditService } from '../login-audit.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-login-audit-list',
  templateUrl: './login-audit-list.component.html',
  styleUrls: ['./login-audit-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    UTCToLocalTime,
    MatCardModule,
    NgClass
  ]
})
export class LoginAuditListComponent extends BaseComponent implements OnInit, AfterViewInit {

  dataSource!: LoginAuditDataSource;
  loginAudits: LoginAudit[] = [];
  displayedColumns: string[] = ['loginTime', 'userName', 'remoteIP', 'status', 'latitude', 'longitude'];
  footerToDisplayed = ['footer'];
  loginAuditResource: LoginAuditResource;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('input') input!: ElementRef;

  constructor(private loginAuditService: LoginAuditService
  ) {
    super();
    this.getLangDir();
    this.loginAuditResource = new LoginAuditResource();
    this.loginAuditResource.pageSize = 10;
    this.loginAuditResource.orderBy = 'loginTime desc'
  }

  ngOnInit(): void {
    this.dataSource = new LoginAuditDataSource(this.loginAuditService);
    this.dataSource.loadLoginAudits(this.loginAuditResource);
    this.getResourceParameter();

    this.dataSource.connect().subscribe((loginAudits) => {
      this.loginAudits = loginAudits;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.loginAuditResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.loginAuditResource.pageSize = this.paginator.pageSize;
          this.loginAuditResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadLoginAudits(this.loginAuditResource);
        })
      )
      .subscribe();

    this.sub$.sink = fromEvent(this.input.nativeElement, 'keyup')
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        tap(() => {
          this.paginator.pageIndex = 0;
          this.loginAuditResource.userName = this.input.nativeElement.value;
          this.dataSource.loadLoginAudits(this.loginAuditResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.loginAuditResource.pageSize = c.pageSize;
          this.loginAuditResource.skip = c.skip;
          this.loginAuditResource.totalCount = c.totalCount;
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM  
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.loginAudits.indexOf(row);
  }
}
