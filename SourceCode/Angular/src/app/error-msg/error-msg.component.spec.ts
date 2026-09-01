import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { ErrorMsgComponent } from './error-msg.component';

describe('ErrorMsgComponent', () => {
  let component: ErrorMsgComponent;
  let fixture: ComponentFixture<ErrorMsgComponent>;
  let queryParams$: BehaviorSubject<Record<string, string>>;

  function createFixture(): void {
    fixture = TestBed.createComponent(ErrorMsgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    queryParams$ = new BehaviorSubject<Record<string, string>>({});
    TestBed.configureTestingModule({
      imports: [ErrorMsgComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$.asObservable() } },
      ],
    });
  });

  it('should create with empty error code when no params', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(component.errorCode).toBe('');
    expect(fixture.nativeElement.textContent).toContain('An error occurred while processing your request');
  });

  it('should display license verification message from query params', () => {
    queryParams$.next({ errorCode: 'COULD_NOT_VERIFY_LICENSE' });
    createFixture();
    expect(component.errorCode).toBe('COULD_NOT_VERIFY_LICENSE');
    expect(fixture.nativeElement.textContent).toContain('Could not verify license.');
  });

  it('should display purchase link for unowned item error', () => {
    queryParams$.next({ errorCode: 'YOU_DOES_NOT_OWN_THIS_ITEM' });
    createFixture();
    expect(fixture.nativeElement.textContent).toContain('You do not own this product');
    const link = fixture.nativeElement.querySelector('a');
    expect(link.href).toContain('codecanyon.net');
  });

  it('should display the production url for already hosted error', () => {
    queryParams$.next({ errorCode: 'PRODUCT_ALREADY_HOSTED', production_url: 'https://other.domain' });
    createFixture();
    expect(component.productionUrl).toBe('https://other.domain');
    expect(fixture.nativeElement.textContent).toContain('https://other.domain');
  });

  it('should fall back to the default message for unknown error codes', () => {
    queryParams$.next({ errorCode: 'SOMETHING_ELSE' });
    createFixture();
    expect(fixture.nativeElement.textContent).toContain('An error occurred while processing your request');
  });
});
