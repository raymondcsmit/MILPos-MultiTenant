import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookClose } from './book-close';

describe('BookClose', () => {
  let component: BookClose;
  let fixture: ComponentFixture<BookClose>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookClose]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookClose);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
