import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantAddUpdate } from './tenant-add-update';

describe('TenantAddUpdate', () => {
  let component: TenantAddUpdate;
  let fixture: ComponentFixture<TenantAddUpdate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantAddUpdate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantAddUpdate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
