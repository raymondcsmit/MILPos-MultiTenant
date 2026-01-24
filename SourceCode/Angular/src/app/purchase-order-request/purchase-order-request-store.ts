import { inject } from "@angular/core";
import { CommonError } from "@core/error-handler/common-error";
import { TranslationService } from "@core/services/translation.service";
import { tapResponse } from "@ngrx/operators";
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from "rxjs";
import { HttpResponse } from "@angular/common/http";
import { toObservable } from "@angular/core/rxjs-interop";
import { PurchaseOrder } from "@core/domain-classes/purchase-order";
import { PurchaseOrderResourceParameter } from "@core/domain-classes/purchase-order-resource-parameter";
import { PurchaseOrderStatusEnum } from "@core/domain-classes/purchase-order-status";
import { PurchaseOrderService } from "../purchase-order/purchase-order.service";
import { ResponseHeader } from "@core/domain-classes/response-header";
import { ToastrService } from "@core/services/toastr.service";

type PurchaseOrderRequestState = {
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  loadList: boolean;
  purchaseOrderResourceParameter: PurchaseOrderResourceParameter;
  commonError: CommonError | null;
  isAddUpdate: boolean;
};

export const initialPurchaseOrderRequestState: PurchaseOrderRequestState = {
  purchaseOrders: [],
  isLoading: false,
  loadList: false,
  isAddUpdate: false,
  purchaseOrderResourceParameter: {
    orderNumber: '',
    supplierName: '',
    poCreatedDate: null,
    supplierId: '',
    isPurchaseOrderRequest: true,
    fromDate: null,
    toDate: null,
    productId: '',
    productName: '',
    status: PurchaseOrderStatusEnum.All,
    locationId: '',
    pageSize: 30,
    orderBy: 'poCreatedDate asc',
    fields: '',
    searchQuery: '',
    skip: 0,
    totalCount: 0,
    name: '',
    deliveryStatus: '',
    paymentStatus: ''
  },
  commonError: null
};

export const PurchaseOrderRequestStore = signalStore(
  { providedIn: 'root' },
  withState(initialPurchaseOrderRequestState),
  withComputed(({ }) => ({
  })),
  withMethods((store, purchaseOrderService = inject(PurchaseOrderService),
    toastrService = inject(ToastrService),
    translationService = inject(TranslationService)) => ({
      loadByQuery: rxMethod<PurchaseOrderResourceParameter>(
        pipe(
          debounceTime(300),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((resourceParam: PurchaseOrderResourceParameter) => {
            return purchaseOrderService.getAllPurchaseOrder(resourceParam).pipe(
              tapResponse({
                next: (purchaseOrdersWithHeader: HttpResponse<PurchaseOrder[]>) => {
                  if (purchaseOrdersWithHeader && purchaseOrdersWithHeader.headers.get('X-Pagination')) {
                    const paginationParam = JSON.parse(
                      purchaseOrdersWithHeader.headers.get('X-Pagination') ?? '{}'
                    ) as ResponseHeader;
                    const newPurchaseOrderResourceParameter = {
                      ...resourceParam,
                      ...paginationParam,
                    };
                    patchState(store, {
                      purchaseOrders: purchaseOrdersWithHeader.body ? [...purchaseOrdersWithHeader.body] : [],
                      isLoading: false,
                      commonError: null,
                      loadList: false,
                      isAddUpdate: false,
                      purchaseOrderResourceParameter: { ...newPurchaseOrderResourceParameter }
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
      deletePurchaseOrderById: rxMethod<string>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((id: string) => {
            return purchaseOrderService.deletePurchaseOrder(id).pipe(
              tapResponse({
                next: () => {
                  toastrService.success(translationService.getValue('PURCHASE_ORDER_REQUEST_DELETED'));
                  patchState(store,
                    {
                      isLoading: false,
                      loadList: true
                    });
                },
                error: (err: CommonError) => {
                  patchState(store, { commonError: err, isLoading: false });
                },
              })
            );
          })
        )
      ),
      addUpdatePurchaseOrder: rxMethod<PurchaseOrder>(
        pipe(
          distinctUntilChanged(),
          tap(() => patchState(store, { isLoading: true })),
          switchMap((purchaseOrder: PurchaseOrder) => {
            if (purchaseOrder.id) {
              return purchaseOrderService.updatePurchaseOrder(purchaseOrder).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(translationService.getValue('PURCHASE_REQUEST_SAVED_SUCCESSFULLY'));
                    patchState(store,
                      {
                        isLoading: false,
                        loadList: true,
                        isAddUpdate: true
                      });
                  },
                  error: (err: CommonError) => {
                    patchState(store,
                      {
                        commonError: err,
                        isLoading: false
                      });
                  },
                })
              );
            } else {
              return purchaseOrderService.addPurchaseOrder(purchaseOrder).pipe(
                tapResponse({
                  next: () => {
                    toastrService.success(translationService.getValue('PURCHASE_REQUEST_SAVED_SUCCESSFULLY'));
                    patchState(store,
                      {
                        isLoading: false,
                        loadList: true,
                        isAddUpdate: true
                      });
                  },
                  error: (err: CommonError) => {
                    patchState(store,
                      {
                        commonError: err,
                        isLoading: false
                      });
                  },
                })
              );
            }
          })
        )
      ),
    })),
  withHooks({
    onInit(store) {
      toObservable(store.loadList).subscribe((flag) => {
        if (flag) {
          store.loadByQuery(store.purchaseOrderResourceParameter());
        }
      });
      store.loadByQuery(store.purchaseOrderResourceParameter());
    },

  }),
);
