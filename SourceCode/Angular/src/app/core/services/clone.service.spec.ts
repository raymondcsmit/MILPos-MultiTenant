import { TestBed } from '@angular/core/testing';

import { ClonerService } from './clone.service';

describe('ClonerService', () => {
  let service: ClonerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClonerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deepClone returns an equal but non-identical copy of an object', () => {
    const source = { id: '1', nested: { value: 42 } };
    const copy = service.deepClone<typeof source>(source);
    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
    expect(copy.nested).not.toBe(source.nested);
  });

  it('deepClone does not share state with the source object', () => {
    const source = { id: '1', nested: { value: 42 } };
    const copy = service.deepClone<typeof source>(source);
    copy.nested.value = 100;
    expect(source.nested.value).toBe(42);
  });

  it('deepClone clones arrays and their elements', () => {
    const source = [{ id: 'a' }, { id: 'b' }];
    const copy = service.deepClone<typeof source>(source);
    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
    expect(copy[0]).not.toBe(source[0]);
  });
});
