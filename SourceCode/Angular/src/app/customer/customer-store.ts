import { inject } from "@angular/core";
import { CommonError } from "@core/error-handler/common-error";
import { TranslationService } from "@core/services/translation.service";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from "rxjs";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { Customer } from "@core/domain-classes/customer";
import { CustomerResourceParameter } from "@core/domain-classes/customer-resource-parameter";
import { CustomerService } from "./customer.service";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { ToastrService } from "@core/services/toastr.service";

type CustomerState = {
  customers: Customer[];
  isLoading: boolean;
  isDeleted: boolean;
  customerResourceParameter: CustomerResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
  currentCustomer: Customer | null;
};

export const initialCustomerState: CustomerState = {
  customers: [],
  isLoading: false,
  isDeleted: false,
  isAddUpdate: false,
  currentCustomer: null,
  customerResourceParameter: {
    id: '',
    customerName: '',
    mobileNo: '',
    phoneNo: '',
    email: '',
    contactPerson: '',
    website: '',
    locationId: '',
    pageSize: 15,
    orderBy: 'customerName asc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: ''
  },
  commonError: null
};

export const CustomerStore = signalStore(
  { providedIn: 'root' },
  withState(initialCustomerState),
  withComputed(({ }) => ({
  })),
  withMethods((store, customerService = inject(CustomerService),
    toastrService = inject(ToastrService),
    translationService = inject(TranslationService)) => ({
      loadByQuery: rxMethod<CustomerResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: CustomerResourceParameter) => {
            return customerService.getCustomers(resourceParam).pipe(
              tapResponse({
                next: (customersWithHeader: HttpResponse<Customer[]>) => {
                  if (customersWithHeader && customersWithHeader.headers.get('X-Pagination')) {
                    const paginationParam = JSON.parse(
                      customersWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;
                    const newCustomerResourceParameter = {
                      ...resourceParam,
                      ...paginationParam,
                    };
                    patchState(store,
                      {
                        customers: customersWithHeader.body ? [...customersWithHeader.body] : [],
                        isLoading: false,
                        commonError: null,
                        isDeleted: false,
                        customerResourceParameter: { ...newCustomerResourceParameter },
                        isAddUpdate: false
                      })
                  }
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                  console.error(err);
                },
              })
            );
          })
        )
      ),
      deleteCustomerById: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap((customerId: string) => {
            return customerService.deleteCustomer(customerId).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('CUSTOMER_DELETED_SUCCESSFULLY'));
                  patchState(store, { isLoading: false, isDeleted: true });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      addUpdateCustomer: rxMethod<Customer>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((customer: Customer) => {
            if (customer.id) {
              return customerService.updateCustomer(customer.id, customer).pipe(
                tapResponse({
                  next: (cust: Customer) => {
                    toastrService.success(translationService.getValue('CUSTOMER_SAVE_SUCCESSFULLY'));
                    patchState(store, { isLoading: false, isDeleted: true, isAddUpdate: true, currentCustomer: { ...cust } });
                  },
                  error: (err: CommonError) => {
                    patchState(store, { commonError: err, isLoading: false });
                  },
                })
              );
            } else {
              return customerService.saveCustomer(customer).pipe(
                tapResponse({
                  next: (cust: Customer) => {
                    toastrService.success(translationService.getValue('CUSTOMER_SAVE_SUCCESSFULLY'));
                    patchState(store, { isLoading: false, isDeleted: true, isAddUpdate: true, currentCustomer: { ...cust } });
                  },
                  error: (err: CommonError) => {
                    patchState(store, { commonError: err, isLoading: false });
                  },
                })
              );
            }
          })
        )
      )
    })),
  withHooks({
    onInit(store) {
      toObservable(store.isDeleted).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.customerResourceParameter());
        }
      });
      store.loadByQuery(store.customerResourceParameter());
    },
  }),
);
