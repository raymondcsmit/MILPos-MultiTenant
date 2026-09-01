import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { NLogListComponent } from './n-log-list.component';
import { NLogService } from '../n-log.service';
import { NLog } from '@core/domain-classes/n-log';
import { PageEvent } from '@angular/material/paginator';

describe('NLogListComponent', () => {
  let component: NLogListComponent;
  let fixture: ComponentFixture<NLogListComponent>;
  let nLogService: jasmine.SpyObj<NLogService>;
  let lastParams: any;

  const logs = [
    { id: 'n1', logged: '2026-01-01T10:00:00Z', level: 'Error', message: 'Boom 1', source: '.Net Core' },
    { id: 'n2', logged: '2026-01-02T10:00:00Z', level: 'Warn', message: 'Boom 2', source: 'Angular' },
  ] as unknown as NLog[];

  beforeEach(async () => {
    nLogService = jasmine.createSpyObj('NLogService', ['getNLogs']);
    nLogService.getNLogs.and.callFake((r: any) => {
      lastParams = { level: r.level, source: r.source, message: r.message, skip: r.skip, pageSize: r.pageSize, orderBy: r.orderBy };
      return of(new HttpResponse({
        body: logs,
        headers: new HttpHeaders().set('X-Pagination', JSON.stringify({ pageSize: 10, skip: 0, totalCount: logs.length })),
      }));
    });

    TestBed.configureTestingModule({
      imports: [NLogListComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: NLogService, useValue: nLogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(NLogListComponent);
    component = fixture.componentInstance;
  });

  it('should create with Error level default and load logs into the table', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.nLogResource.level).toBe('Error');
    expect(component.logs.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Boom 1');
  });

  it('onLevelChange sets the level, resets paging and reloads', () => {
    fixture.detectChanges();
    component.onLevelChange({ value: 'Fatal' });
    expect(lastParams.level).toBe('Fatal');
    expect(lastParams.skip).toBe(0);
    component.onLevelChange({ value: null });
    expect(lastParams.level).toBe('');
  });

  it('onSourceChange sets the source and reloads', () => {
    fixture.detectChanges();
    component.onSourceChange({ value: 'Angular' });
    expect(lastParams.source).toBe('Angular');
    component.onSourceChange({ value: null });
    expect(lastParams.source).toBe('');
  });

  it('paginator page updates skip/pageSize and reloads', () => {
    fixture.detectChanges();
    component.paginator.pageSize = 20;
    component.paginator.pageIndex = 1;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 42 } as PageEvent);
    expect(lastParams.skip).toBe(20);
    expect(lastParams.pageSize).toBe(20);
  });

  it('sort change resets page index and orders the reload', () => {
    fixture.detectChanges();
    component.sort.active = 'level';
    component.sort.direction = 'asc';
    component.paginator.pageIndex = 3;
    component.sort.sortChange.emit({ active: 'level', direction: 'asc' } as any);
    expect(component.paginator.pageIndex).toBe(0);
    expect(lastParams.orderBy).toBe('level asc');
  });

  it('message keyup debounce filters and resets paging', fakeAsync(() => {
    fixture.detectChanges();
    component.input.nativeElement.value = 'boom';
    component.input.nativeElement.dispatchEvent(new Event('keyup'));
    tick(1000);
    expect(lastParams.message).toBe('boom');
    expect(lastParams.skip).toBe(0);
  }));

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(logs[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
