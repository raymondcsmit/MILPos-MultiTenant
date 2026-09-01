import { CurrencyPipe } from '@angular/common';
import { CustomCurrencyPipe } from './custome-currency.pipe';
import { SecurityService } from '@core/security/security.service';

describe('CustomCurrencyPipe', () => {
  let currencyPipeSpy: jasmine.SpyObj<CurrencyPipe>;
  let securityServiceSpy: jasmine.SpyObj<SecurityService>;
  let pipe: CustomCurrencyPipe;

  beforeEach(() => {
    currencyPipeSpy = jasmine.createSpyObj('CurrencyPipe', ['transform']);
    securityServiceSpy = jasmine.createSpyObj('SecurityService', [], { currencyCode: 'PKR' });
    pipe = new CustomCurrencyPipe(currencyPipeSpy, securityServiceSpy);
  });

  it('formats value with the company currency code', () => {
    currencyPipeSpy.transform.and.returnValue('PKR 5.00');
    expect(pipe.transform(5)).toBe('PKR 5.00');
    expect(currencyPipeSpy.transform).toHaveBeenCalledWith(5, 'PKR');
  });

  it('treats null as 0', () => {
    currencyPipeSpy.transform.and.returnValue('PKR 0.00');
    expect(pipe.transform(null)).toBe('PKR 0.00');
    expect(currencyPipeSpy.transform).toHaveBeenCalledWith(0, 'PKR');
  });

  it('treats undefined as 0', () => {
    currencyPipeSpy.transform.and.returnValue('PKR 0.00');
    expect(pipe.transform(undefined)).toBe('PKR 0.00');
    expect(currencyPipeSpy.transform).toHaveBeenCalledWith(0, 'PKR');
  });
});
