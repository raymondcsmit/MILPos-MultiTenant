import { inject } from "@angular/core";
import { CommonError } from "@core/error-handler/common-error";
import { TranslationService } from "@core/services/translation.service";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from "rxjs";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { Supplier } from "@core/domain-classes/supplier";
import { SupplierResourceParameter } from "@core/domain-classes/supplier-resource-parameter";
import { SupplierService } from "./supplier.service";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { ToastrService } from "@core/services/toastr.service";


type SupplierState = {
  suppliers: Supplier[];
  isLoading: boolean;
  loadList: boolean;
  supplierResourceParameter: SupplierResourceParameter,
  commonError: CommonError | null,
  currentSupplier: Supplier | null,
  isAddUpdate: boolean
};

export const initialSupplierState: SupplierState = {
  suppliers: [],
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  currentSupplier: null,
  supplierResourceParameter: {
    supplierName: '',
    mobileNo: '',
    email: '',
    website: '',
    country: '',
    id: '',
    pageSize: 30,
    orderBy: 'supplierName asc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: ''
  },
  commonError: null
};

export const SupplierStore = signalStore(
  { providedIn: 'root' },
  withState(initialSupplierState),
  // withStorageSync({
  //   key: 'purchaseorders', // key used when writing to/reading from storage
  //   autoSync: true, // read from storage on init and write on state changes - `true` by default
  //   storage: () => sessionStorage,
  //   // factory to select storage to sync with
  // }),
  withComputed(({ }) => ({
  })),
  withMethods((store, supplierService = inject(SupplierService),
    toastrService = inject(ToastrService),
    translationService = inject(TranslationService)) => ({
      loadByQuery: rxMethod<SupplierResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: SupplierResourceParameter) => {
            return supplierService.getSuppliers(resourceParam).pipe(
              tapResponse({
                next: (suppliersWithHeader: HttpResponse<Supplier[]>) => {
                  if (suppliersWithHeader && suppliersWithHeader.headers.get('X-Pagination')) {
                    const paginationParam = JSON.parse(
                      suppliersWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;

                    const newPurchaseOrderResourceParameter = {
                      ...resourceParam,
                      ...paginationParam,
                    };
                    patchState(store, {
                      suppliers: suppliersWithHeader.body ? [...suppliersWithHeader.body] : [],
                      isLoading: false,
                      commonError: null,
                      loadList: false,
                      isAddUpdate: false,
                      supplierResourceParameter: { ...newPurchaseOrderResourceParameter }
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
      deleteSupplierById: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap((id: string) => {
            return supplierService.deleteSupplier(id).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('SUPPLIER_DELETED_SUCCESSFULLY'));
                  patchState(store, { isLoading: false, loadList: true });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      addSupplier: rxMethod<Supplier>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((supplier: Supplier) => {
            return supplierService.saveSupplier(supplier).pipe(
              tapResponse({
                next: (supplier: Supplier) => {
                  toastrService.success(translationService.getValue('SUPPLIER_SAVE_SUCCESSFULLY'));
                  patchState(store, { isLoading: false, loadList: true, currentSupplier: { ...supplier }, isAddUpdate: true });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      updateSupplier: rxMethod<Supplier>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((supplier: Supplier) => {
            return supplierService.updateSupplier(supplier.id, supplier).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('SUPPLIER_SAVE_SUCCESSFULLY'));
                  patchState(store, { isLoading: false, loadList: true, currentSupplier: { ...supplier }, isAddUpdate: true });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
    })),
  withHooks({
    onInit(store) {
      toObservable(store.loadList).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.supplierResourceParameter());
        }
      });
      store.loadByQuery(store.supplierResourceParameter());
    },
  }),
);
