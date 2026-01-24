import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandDrawer } from './brand-drawer';

describe('BrandDrawer', () => {
  let component: BrandDrawer;
  let fixture: ComponentFixture<BrandDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandDrawer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandDrawer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
