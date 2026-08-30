import { TestBed } from '@angular/core/testing';

import { ProfitLossReportService } from './profit-loss-report.service';
import { TranslateModule } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';

describe('ProfitLossReportService', () => {
  let service: ProfitLossReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideHttpClient(), { provide: JwtHelperService, useValue: {} }],
    });
    service = TestBed.inject(ProfitLossReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});