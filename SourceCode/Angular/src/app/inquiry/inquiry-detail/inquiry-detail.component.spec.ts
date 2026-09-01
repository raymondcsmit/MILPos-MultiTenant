import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subject, BehaviorSubject, of } from 'rxjs';

import { InquiryDetailComponent } from './inquiry-detail.component';
import { InquiryService } from '../inquiry.service';
import { InquiryNoteService } from '../inquiry-note/inquiry-note.service';
import { InquiryTaskService } from '../inquiry-task/inquiry-task.service';
import { InquiryAttachmentService } from '../inquiry-attachment/inquiry-attachment.service';
import { CommonService } from '@core/services/common.service';
import { ProductService } from '../../product/product.service';
import { InquiryStatusService } from '@core/services/inquiry-status.service';
import { InquirySourceService } from '@core/services/inquiry-source.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { Inquiry } from '@core/domain-classes/inquiry';

describe('InquiryDetailComponent', () => {
  let component: InquiryDetailComponent;
  let fixture: ComponentFixture<InquiryDetailComponent>;
  let inquiryService: jasmine.SpyObj<InquiryService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let productService: jasmine.SpyObj<ProductService>;
  let inquiryStatusService: jasmine.SpyObj<InquiryStatusService>;
  let inquirySourceService: jasmine.SpyObj<InquirySourceService>;
  let inquiryNoteService: jasmine.SpyObj<InquiryNoteService>;
  let inquiryTaskService: jasmine.SpyObj<InquiryTaskService>;
  let inquiryAttachmentService: jasmine.SpyObj<InquiryAttachmentService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;
  let routeData: Subject<any>;

  const inquiry = {
    id: 'i1',
    companyName: 'Acme',
    contactPerson: 'Ali',
    email: 'a@x.com',
    mobileNo: '0300',
    phone: '042',
    website: 'https://acme.com',
    address: 'street 1',
    cityName: 'Lahore',
    countryName: 'Pakistan',
    message: 'hello',
    inquirySourceId: 'src1',
    inquiryStatusId: 's1',
    assignTo: 'u1',
    inquiryProducts: [
      { productId: 'p1', name: 'Coke', inquiryId: 'i1' },
      { productId: 'p2', name: 'Pepsi', inquiryId: 'i1' },
    ],
  } as unknown as Inquiry;

  beforeEach(async () => {
    inquiryService = jasmine.createSpyObj<InquiryService>('InquiryService', ['saveInquiry', 'updateInquiry', 'getProductsByInquiryId']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getCountry', 'getCityByName', 'getAllUsers', 'getPageHelperText']);
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    inquiryStatusService = jasmine.createSpyObj<InquiryStatusService>('InquiryStatusService', ['getAll']);
    inquirySourceService = jasmine.createSpyObj<InquirySourceService>('InquirySourceService', ['getAll']);
    inquiryNoteService = jasmine.createSpyObj<InquiryNoteService>('InquiryNoteService', ['getInquiryNotes', 'saveInquiryNote', 'deleteInquiryNote']);
    inquiryTaskService = jasmine.createSpyObj<InquiryTaskService>('InquiryTaskService', ['getInquiryTasks', 'saveInquiryActivity', 'updateInquiryActivity', 'deleteInquiryActivity']);
    inquiryAttachmentService = jasmine.createSpyObj<InquiryAttachmentService>('InquiryAttachmentService', ['getInquiryAttachments', 'saveInquiryAttachment', 'deleteInquiryAttachment', 'downloadFile']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    routeData = new Subject<any>();
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    await TestBed.configureTestingModule({
      imports: [InquiryDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        { provide: InquiryService, useValue: inquiryService },
        { provide: CommonService, useValue: commonService },
        { provide: ProductService, useValue: productService },
        { provide: InquiryStatusService, useValue: inquiryStatusService },
        { provide: InquirySourceService, useValue: inquirySourceService },
        { provide: InquiryNoteService, useValue: inquiryNoteService },
        { provide: InquiryTaskService, useValue: inquiryTaskService },
        { provide: InquiryAttachmentService, useValue: inquiryAttachmentService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } }, data: routeData.asObservable(), params: new Subject<any>().asObservable(), queryParams: new Subject<any>().asObservable(), paramMap: new Subject<any>().asObservable(), url: new Subject<any>().asObservable() } },
        {
          provide: SecurityService,
          useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }),
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(): void {
    commonService.getCountry.and.returnValue(of([{ id: 'co1', name: 'Pakistan' } as any]));
    commonService.getCityByName.and.returnValue(of([{ id: 'ci1', name: 'Lahore' } as any]));
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', firstName: 'Ali', lastName: 'Khan' } as any]));
    inquiryStatusService.getAll.and.returnValue(of([{ id: 's1', statusName: 'New' } as any]));
    inquirySourceService.getAll.and.returnValue(of([{ id: 'src1', name: 'Web' } as any]));
    productService.getProductsDropdown.and.returnValue(of([]));
    inquiryNoteService.getInquiryNotes.and.returnValue(of([]));
    inquiryTaskService.getInquiryTasks.and.returnValue(of([]));
    inquiryAttachmentService.getInquiryAttachments.and.returnValue(of([]));
    fixture = TestBed.createComponent(InquiryDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create in add mode with lookups loaded and empty products array', () => {
    create();
    routeData.next({});
    expect(component).toBeTruthy();
    expect(component.titlePage).toBe('Add Inquiry');
    expect(component.inquiryForm).toBeTruthy();
    expect(component.countries.length).toBe(1);
    expect(component.inquiryStatuses.length).toBe(1);
    expect(component.sourcesOfInquiry.length).toBe(1);
    expect(component.users.length).toBe(1);
    expect(component.inquieryProductArray.length).toBe(0);
  });

  it('route data with inquiry patches form, pushes products and loads cities', fakeAsync(() => {
    create();
    routeData.next({ inquiry });
    tick(1000);
    expect(component.titlePage).toBe('Inquiry Detail');
    expect(component.inquiry).toBe(inquiry);
    expect(component.inquiryForm.get('companyName')?.value).toBe('Acme');
    expect(component.inquiryForm.get('email')?.value).toBe('a@x.com');
    expect(component.inquiryForm.get('inquirySourceId')?.value).toBe('src1');
    expect(component.inquieryProductArray.length).toBe(2);
    expect(commonService.getCityByName).toHaveBeenCalledWith('Pakistan', 'Lahore');
    expect(component.cities.length).toBe(1);
  }));

  it('submit without products reports error and calls no api', () => {
    create();
    component.onInquirySubmit();
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(inquiryService.saveInquiry).not.toHaveBeenCalled();
    expect(inquiryService.updateInquiry).not.toHaveBeenCalled();
  });

  it('submit with invalid form marks controls touched and calls no api', () => {
    create();
    component.selectProduct({ id: 'p1', name: 'Coke' } as any);
    component.onInquirySubmit();
    expect(component.inquiryForm.get('companyName')?.touched).toBe(true);
    expect(component.inquiryForm.get('inquiryStatusId')?.touched).toBe(true);
    expect(inquiryService.saveInquiry).not.toHaveBeenCalled();
  });

  it('valid new inquiry saves and navigates to list', () => {
    inquiryService.saveInquiry.and.returnValue(of({ id: 'new' } as Inquiry));
    create();
    component.selectProduct({ id: 'p1', name: 'Coke' } as any);
    component.inquiryForm.patchValue({
      companyName: 'Acme', contactPerson: 'Ali', email: 'a@x.com',
      inquirySourceId: 'src1', inquiryStatusId: 's1',
    });
    component.onInquirySubmit();
    expect(inquiryService.saveInquiry).toHaveBeenCalledWith(jasmine.objectContaining({ id: '', companyName: 'Acme', inquirySourceId: 'src1' }));
    expect(inquiryService.updateInquiry).not.toHaveBeenCalled();
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(router.navigate).toHaveBeenCalledWith(['/inquiry']);
  });

  it('valid existing inquiry updates by id and navigates to list', () => {
    inquiryService.updateInquiry.and.returnValue(of({} as Inquiry));
    create();
    routeData.next({ inquiry });
    component.onInquirySubmit();
    expect(inquiryService.updateInquiry).toHaveBeenCalledWith('i1', jasmine.objectContaining({ id: 'i1', companyName: 'Acme' }));
    expect(inquiryService.saveInquiry).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/inquiry']);
  });

  it('selectProduct pushes a product row and clears the search input', () => {
    create();
    component.selectProduct({ id: 'p9', name: 'Fanta' } as any);
    expect(component.inquieryProductArray.length).toBe(1);
    expect(component.inquieryProductArray.at(0).getRawValue()).toEqual(jasmine.objectContaining({ productId: 'p9', name: 'Fanta' }));
    expect(component.inquiryForm.get('productNameInput')?.value).toBeNull();
  });

  it('removeProduct removes the row at index', () => {
    create();
    component.selectProduct({ id: 'p9', name: 'Fanta' } as any);
    component.selectProduct({ id: 'p10', name: 'Sprite' } as any);
    component.removeProduct(0);
    expect(component.inquieryProductArray.length).toBe(1);
    expect(component.inquieryProductArray.at(0).getRawValue().name).toBe('Sprite');
  });

  it('productNameInput debounce searches products dropdown', fakeAsync(() => {
    create();
    productService.getProductsDropdown.and.returnValue(of([{ id: 'p1', name: 'Coke' } as any]));
    component.inquiryForm.get('productNameInput')?.setValue('Cok');
    tick(500);
    expect(productService.getProductsDropdown).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Cok' }));
    expect(component.products.length).toBe(1);
  }));

  it('onCountryChange clears city and loads cities for the country', fakeAsync(() => {
    create();
    component.onCountryChange('Pakistan');
    expect(component.inquiryForm.get('cityName')?.value).toBe('');
    tick(1000);
    expect(commonService.getCityByName).toHaveBeenCalledWith('Pakistan', '');
  }));

  it('onCountryChange with falsy country clears cities', fakeAsync(() => {
    create();
    routeData.next({ inquiry });
    tick(1000);
    component.onCountryChange(null);
    expect(component.cities.length).toBe(0);
  }));

  it('onInquiryList navigates back to inquiry list', () => {
    create();
    component.onInquiryList();
    expect(router.navigate).toHaveBeenCalledWith(['/inquiry']);
  });

  it('onAddReminder opens reminder dialog for the inquiry', () => {
    create();
    routeData.next({ inquiry });
    component.onAddReminder();
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { application: 3, referenceId: 'i1' } }));
  });
});
