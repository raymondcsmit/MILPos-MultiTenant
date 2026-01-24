import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionItemListComponent } from './transaction-item-list.component';

describe('TransactionItemListComponent', () => {
  let component: TransactionItemListComponent;
  let fixture: ComponentFixture<TransactionItemListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionItemListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionItemListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
