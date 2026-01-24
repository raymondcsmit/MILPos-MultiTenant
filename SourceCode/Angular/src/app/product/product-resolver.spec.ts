import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { ProductsResolver } from './product-resolver';
import { Product } from '../core/domain-classes/product';

describe('ProductsResolver', () => {
  const executeResolver: ResolveFn<Product[]> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => ProductsResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
