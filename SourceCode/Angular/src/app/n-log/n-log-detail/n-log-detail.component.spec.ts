import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { NLogDetailComponent } from './n-log-detail.component';

describe('NLogDetailComponent', () => {
  let component: NLogDetailComponent;
  let fixture: ComponentFixture<NLogDetailComponent>;
  let routeData: Subject<any>;

  beforeEach(async () => {
    routeData = new Subject<any>();
    TestBed.configureTestingModule({
      imports: [NLogDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NLogDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create with no log before resolver data arrives', () => {
    component.ngOnInit();
    expect(component).toBeTruthy();
    expect(component.log).toBeUndefined();
  });

  it('binds the resolver log and renders its fields', () => {
    component.log = { id: 'n1', level: 'Error', message: 'Boom', source: '.Net Core', logged: '2026-01-01T10:00:00Z' } as any;
    fixture.detectChanges();
    routeData.next({
      log: { id: 'n2', level: 'Fatal', message: 'Bigger boom', source: 'Angular', logged: '2026-02-01T10:00:00Z' },
    });
    fixture.detectChanges();
    expect(component.log.id).toBe('n2');
    expect(fixture.nativeElement.textContent).toContain('Bigger boom');
  });

  it('ignores resolver emissions without a log', () => {
    component.log = { id: 'n1', level: 'Error', message: 'Boom', source: '.Net Core', logged: '2026-01-01T10:00:00Z' } as any;
    fixture.detectChanges();
    routeData.next({});
    expect(component.log.id).toBe('n1');
  });
});
