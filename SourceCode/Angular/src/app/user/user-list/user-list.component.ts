import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { User } from '@core/domain-classes/user';
import { UserResource } from '@core/domain-classes/user-resource';
import { ToastrService } from '@core/services/toastr.service';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { ResetPasswordComponent } from '../reset-password/reset-password.component';
import { UserService } from '../user.service';
import { UserDataSource } from './user-datasource';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    HasClaimDirective,
    FormsModule,
    RouterModule,
    MatMenuModule,
    MatButtonModule,
    MatCardModule,
    NgClass
  ]
})
export class UserListComponent
  extends BaseComponent
  implements OnInit, AfterViewInit {
  dataSource!: UserDataSource;
  users: User[] = [];
  displayedColumns: string[] = [
    'action',
    'email',
    'firstName',
    'lastName',
    'phoneNumber',
    'isActive',
  ];
  footerToDisplayed = ['footer'];
  userResource: UserResource;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  _firstNameFilter!: string;
  _lastNameFilter!: string;
  _emailFilter!: string;
  _mobileNoFilter!: string;

  public filterObservable$: Subject<string> = new Subject<string>();

  public get FirstNameFilter(): string {
    return this._firstNameFilter;
  }

  public set FirstNameFilter(v: string) {
    this._firstNameFilter = v;
    const firstNameFilter = `firstName:${v}`;
    this.filterObservable$.next(firstNameFilter);
  }

  public get LastNameFilter(): string {
    return this._lastNameFilter;
  }

  public set LastNameFilter(v: string) {
    this._lastNameFilter = v;
    const lastNameFilter = `lastName:${v}`;
    this.filterObservable$.next(lastNameFilter);
  }

  public get EmailFilter(): string {
    return this._emailFilter;
  }
  public set EmailFilter(v: string) {
    this._emailFilter = v;
    const emailFilter = `email:${v}`;
    this.filterObservable$.next(emailFilter);
  }

  public get MobileNoFilter(): string {
    return this._mobileNoFilter;
  }

  public set MobileNoFilter(v: string) {
    this._mobileNoFilter = v;
    const mobileOrFilter = `phoneNumber:${v}`;
    this.filterObservable$.next(mobileOrFilter);
  }

  constructor(
    private userService: UserService,
    private toastrService: ToastrService,
    private commonDialogService: CommonDialogService,
    private dialog: MatDialog,
    private router: Router
  ) {
    super();
    this.getLangDir();
    this.userResource = new UserResource();
    this.userResource.pageSize = 10;
    this.userResource.orderBy = 'email desc';
  }

  ngOnInit(): void {
    this.dataSource = new UserDataSource(this.userService);
    this.dataSource.loadUsers(this.userResource);
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.userResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'firstName') {
          this.userResource.firstName = escape(strArray[1]);
        } else if (strArray[0] === 'email') {
          this.userResource.email = strArray[1];
        } else if (strArray[0] === 'lastName') {
          this.userResource.lastName = strArray[1];
        } else if (strArray[0] === 'phoneNumber') {
          this.userResource.phoneNumber = strArray[1];
        }
        this.dataSource.loadUsers(this.userResource);
      });
    this.getResourceParameter();

    this.dataSource.connect().subscribe((c) => {
      this.users = c;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.userResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.userResource.pageSize = this.paginator.pageSize;
          this.userResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadUsers(this.userResource);
        })
      )
      .subscribe();
  }

  deleteUser(user: User) {
    this.sub$.sink = this.commonDialogService
      .deleteConformationDialog(
        `${this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
        )} ${user.email}`
      )
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.userService
            .deleteUser(user.id ?? '')
            .subscribe(() => {
              this.toastrService.success(
                this.translationService.getValue('USER_DELETED_SUCCESSFULLY')
              );
              this.paginator.pageIndex = 0;
              this.dataSource.loadUsers(this.userResource);
            });
        }
      });
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$.subscribe(
      (c: ResponseHeader) => {
        if (c) {
          this.userResource.pageSize = c.pageSize;
          this.userResource.skip = c.skip;
          this.userResource.totalCount = c.totalCount;
        }
      }
    );
  }

  resetPassword(user: User): void {
    this.dialog.open(ResetPasswordComponent, {
      width: '350px',
      data: Object.assign({}, user),
    });
  }

  editUser(userId: string) {
    this.router.navigate(['/users/manage', userId]);
  }

  userPermission(userId: string) {
    this.router.navigate(['/users/permission', userId]);
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.users.indexOf(row);
  }
}
