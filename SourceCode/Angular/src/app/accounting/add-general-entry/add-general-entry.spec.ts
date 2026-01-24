import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGeneralEntry } from './add-general-entry';

describe('AddGeneralEntry', () => {
  let component: AddGeneralEntry;
  let fixture: ComponentFixture<AddGeneralEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddGeneralEntry]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddGeneralEntry);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
