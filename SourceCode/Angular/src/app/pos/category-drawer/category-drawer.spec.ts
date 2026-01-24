import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryDrawer } from './category-drawer';

describe('CategoryDrawer', () => {
  let component: CategoryDrawer;
  let fixture: ComponentFixture<CategoryDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryDrawer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryDrawer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
