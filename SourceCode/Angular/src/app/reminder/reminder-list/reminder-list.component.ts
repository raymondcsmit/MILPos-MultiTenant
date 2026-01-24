import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { Reminder } from '@core/domain-classes/reminder';
import { ReminderFrequency } from '@core/domain-classes/reminder-frequency';
import { ReminderResourceParameter } from '@core/domain-classes/reminder-resource-parameter';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { AddReminderComponent } from '../add-reminder/add-reminder.component';
import { ReminderService } from '../reminder.service';
import { ReminderDataSource } from './reminder-datasource';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe, NgClass } from '@angular/common';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReminderFrequencyPipe } from './reminder-frequency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-reminder-list',
  templateUrl: './reminder-list.component.html',
  styleUrls: ['./reminder-list.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatTableModule,
    HasClaimDirective,
    PageHelpTextComponent,
    RouterModule,
    MatSelectModule,
    MatMenuModule,
    TranslateModule,
    FormsModule,
    ReminderFrequencyPipe,
    TruncatePipe,
    UTCToLocalTime,
    MatIconModule,
    MatSortModule,
    MatPaginatorModule,
    AsyncPipe,
    MatCardModule,
    MatButtonModule,
    NgClass
  ],
})
export class ReminderListComponent implements OnInit, AfterViewInit {
  dataSource!: ReminderDataSource;
  reminders: Reminder[] = [];
  reminderFrequencies: ReminderFrequency[] = [];
  displayedColumns: string[] = [
    'action',
    'startDate',
    'endDate',
    'subject',
    'message',
    'frequency',
    'documentName',
  ];
  footerToDisplayed = ['footer'];
  isLoadingResults = true;
  reminderResource: ReminderResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _subjectFilter!: string;
  _messageFilter!: string;
  _frequencyFilter!: string;

  public filterObservable$: Subject<string> = new Subject<string>();

  public get SubjectFilter(): string {
    return this._subjectFilter;
  }

  public set SubjectFilter(v: string) {
    this._subjectFilter = v;
    const subjectFilter = `subject:${v}`;
    this.filterObservable$.next(subjectFilter);
  }

  public set FrequencyFilter(v: string) {
    if (v == '0') {
      this._frequencyFilter = '0';
    } else {
      this._frequencyFilter = v ? v.toString() : '';
    }
    const frequencyFilter = `frequency:${this._frequencyFilter}`;
    this.filterObservable$.next(frequencyFilter);
  }

  public get FrequencyFilter(): string {
    return this._frequencyFilter;
  }

  public get MessageFilter(): string {
    return this._messageFilter;
  }
  public set MessageFilter(v: string) {
    this._messageFilter = v;
    const messageFilter = `message:${v}`;
    this.filterObservable$.next(messageFilter);
  }

  constructor(
    private reminderService: ReminderService,
    private dialog: MatDialog,
    private commonService: CommonService,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService,
    private translationService: TranslationService
  ) {
    this.reminderResource = new ReminderResourceParameter();
    this.reminderResource.pageSize = 10;
    this.reminderResource.orderBy = 'createdDate desc';
  }

  ngOnInit(): void {
    this.getReminderFrequency();
    this.dataSource = new ReminderDataSource(this.reminderService);
    this.dataSource.loadData(this.reminderResource);
    this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.reminderResource.skip = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'subject') {
          this.reminderResource.subject = escape(strArray[1]);
        } else if (strArray[0] === 'message') {
          this.reminderResource.message = strArray[1];
        } else if (strArray[0] === 'frequency') {
          this.reminderResource.frequency = strArray[1];
        }
        this.paginator.pageIndex = 0;
        this.reminderResource.skip = 0;
        this.dataSource.loadData(this.reminderResource);
      });
    this.getResourceParameter();

    this.dataSource.connect().subscribe((c) => {
      this.reminders = c;
    });
  }

  getResourceParameter() {
    this.dataSource.responseHeaderSubject$.subscribe(
      (c: ResponseHeader) => {
        if (c) {
          this.reminderResource.pageSize = c.pageSize;
          this.reminderResource.skip = c.skip;
          this.reminderResource.totalCount = c.totalCount;
        }
      }
    );
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(
      () => (this.paginator.pageIndex = 0)
    );
    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.reminderResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.reminderResource.pageSize = this.paginator.pageSize;
          this.reminderResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.reminderResource);
        })
      )
      .subscribe();
  }

  getReminderFrequency() {
    this.commonService
      .getReminderFrequency()
      .subscribe((f) => (this.reminderFrequencies = [...f]));
  }

  editReminder(reminder: Reminder) {
    this.isLoadingResults = true;
    this.commonService.getReminder(reminder.id ?? '').subscribe(
      {
        next: (reminder: Reminder) => {
          this.isLoadingResults = false;
          let dialog = this.dialog.open(AddReminderComponent, {
            width: '60vw',
            data: Object.assign(
              {},
              {
                frequencies: this.reminderFrequencies,
                reminder,
              }
            ),
          });
          dialog
            .afterClosed()
            .subscribe((isUpdated: boolean) => {
              if (isUpdated) {
                this.dataSource.loadData(this.reminderResource);
              }
            });
        },
        error: () => (this.isLoadingResults = false)

      }
    );
  }

  deleteReminder(reminder: Reminder) {
    this.commonDialogService
      .deleteConformationDialog(
        this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')
      )
      .subscribe((isTrue) => {
        if (isTrue) {
          this.isLoadingResults = true;
          this.reminderService.deleteReminder(reminder.id ?? '').subscribe(
            {
              next: () => {
                this.isLoadingResults = false;
                this.toastrService.success(
                  this.translationService.getValue(
                    'REMINDER_DELETED_SUCCESSFULLY'
                  )
                );
                this.dataSource.loadData(this.reminderResource);
              },
              error: () => (this.isLoadingResults = false)
            });
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.reminders.indexOf(row);
  }
}
