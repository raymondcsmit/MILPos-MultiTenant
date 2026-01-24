import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSmtpSettingComponent } from './test-smtp-setting.component';

describe('TestSmtpSettingComponent', () => {
  let component: TestSmtpSettingComponent;
  let fixture: ComponentFixture<TestSmtpSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestSmtpSettingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestSmtpSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
