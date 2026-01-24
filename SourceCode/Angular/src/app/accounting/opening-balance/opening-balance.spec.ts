import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpeningBalanceModel } from './model/opening-balance';
import { OpeningBalance } from './opening-balance';


describe('OpeningBalance', () => {
  let component: OpeningBalance;
  let fixture: ComponentFixture<OpeningBalance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningBalance]
    })
      .compileComponents();

    fixture = TestBed.createComponent(OpeningBalance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
