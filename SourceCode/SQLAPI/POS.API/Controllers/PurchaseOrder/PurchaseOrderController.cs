using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.MediatR;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.Commands;
using POS.MediatR.PurchaseOrder.Get;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Controllers.PurchaseOrder
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PurchaseOrderController : BaseController
    {
        public IMediator _mediator { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="PurchaseOrderController"/> class.
        /// </summary>
        /// <param name="mediator">The mediator.</param>
        public PurchaseOrderController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Gets all purchase order.
        /// </summary>
        /// <returns></returns>
        /// PO_VIEW_PURCHASE_ORDERS,PO_RETURN_PO,POR_VIEW_PO_REQUESTS,REP_PO_REP,REP_VIEW_INPUT_TAX_REP
        [HttpGet]
        [ClaimCheck("PO_VIEW_PURCHASE_ORDERS", "PO_RETURN_PO", "POR_VIEW_PO_REQUESTS", "REP_PO_REP", "REP_VIEW_INPUT_TAX_REP")]
        [Produces("application/json", "application/xml", Type = typeof(List<PurchaseOrderDto>))]
        public async Task<IActionResult> GetAllPurchaseOrder([FromQuery] PurchaseOrderResource purchaseOrderResource)
        {
            var getAllPurchaseOrderQuery = new GetAllPurchaseOrderQuery
            {
                PurchaseOrderResource = purchaseOrderResource
            };
            var purchaseOrders = await _mediator.Send(getAllPurchaseOrderQuery);

            var paginationMetadata = new
            {
                totalCount = purchaseOrders.TotalCount,
                pageSize = purchaseOrders.PageSize,
                skip = purchaseOrders.Skip,
                totalPages = purchaseOrders.TotalPages
            };

            Response.Headers.Append("X-Pagination",
                Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(purchaseOrders);
        }


        /// <summary>
        /// get purchase order details
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        [ClaimCheck("PO_GENERATE_INVOICE", "PO_VIEW_PO_DETAIL", "PO_UPDATE_PO", "PO_RETURN_PO", "POR_POR_DETAIL", "POR_GENERATE_INVOICE", "POR_CONVERT_TO_PO", "POR_UPDATE_PO_REQUEST", "REP_PO_REP", "REP_PRO_PP_REP", "PO_RETURN_PO")]
        [Produces("application/json", "application/xml", Type = typeof(List<PurchaseOrderDto>))]
        public async Task<IActionResult> GetPurchaseOrder(Guid id)
        {
            var getPurchaseOrderQuery = new GetPurchaseOrderQuery
            {
                Id = id
            };
            var purchaseOrder = await _mediator.Send(getPurchaseOrderQuery);
            return ReturnFormattedResponse(purchaseOrder);
        }


        /// <summary>
        /// Creates the purchase order.
        /// </summary>
        /// <param name="addPurchaseOrderCommand">The add purchase order command.</param>
        /// <returns></returns>
        [HttpPost, DisableRequestSizeLimit]
        [ClaimCheck("PO_ADD_PO", "POR_ADD_PO_REQUEST")]
        [Produces("application/json", "application/xml", Type = typeof(PurchaseOrderDto))]
        public async Task<IActionResult> CreatePurchaseOrder(AddPurchaseOrderCommand addPurchaseOrderCommand)
        {
            var result = await _mediator.Send(addPurchaseOrderCommand);
            return ReturnFormattedResponse(result);
        }
        /// <summary>
        /// Purchase Order Items
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}/returnItems")]
        [Produces("application/json", "application/xml", Type = typeof(List<PurchaseOrderDto>))]
        public async Task<IActionResult> GetPurchaseOrderReturnItems(Guid id)
        {
            var getPurchaseOrderWithReturnItemsCommand = new GetPurchaseOrderWithReturnItemsCommand
            {
                Id = id
            };
            var purchaseOrderItems = await _mediator.Send(getPurchaseOrderWithReturnItemsCommand);
            return Ok(purchaseOrderItems);
        }

        /// <summary>
        /// Update the purchase order.
        /// </summary>
        /// <param name="updatePurchaseOrderCommand">The add purchase order command.</param>
        /// <returns></returns>
        [HttpPut("{id}")]
        [ClaimCheck("PO_UPDATE_PO", "POR_UPDATE_PO_REQUEST", "POR_CONVERT_TO_PO")]
        [Produces("application/json", "application/xml", Type = typeof(PurchaseOrderDto))]
        public async Task<IActionResult> UpdatePurchaseOrder(Guid id, UpdatePurchaseOrderCommand updatePurchaseOrderCommand)
        {
            var result = await _mediator.Send(updatePurchaseOrderCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Update the purchase order Return.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="updatePurchaseOrderCommand">The add purchase order command.</param>
        /// <returns></returns>
        [HttpPut("{id}/return")]
        [ClaimCheck("PO_RETURN_PO")]
        [Produces("application/json", "application/xml", Type = typeof(PurchaseOrderDto))]
        public async Task<IActionResult> UpdatePurchaseOrderReturn(Guid id, UpdatePurchaseOrderReturnCommand updatePurchaseOrderCommand)
        {
            var result = await _mediator.Send(updatePurchaseOrderCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Delete Purchase Order
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        [ClaimCheck("PO_DELETE_PO", "POR_DELETE_PO_REQUEST")]
        public async Task<IActionResult> DeletePurchaseOrder(Guid id)
        {
            var deletePurchaseOrderCommand = new DeletePurchaseOrderCommand
            {
                Id = id
            };
            var response = await _mediator.Send(deletePurchaseOrderCommand);
            return Ok(response);
        }

        /// <summary>
        /// Gets the new purchase order number.
        /// </summary>
        /// <returns></returns>
        [HttpGet("newOrderNumber/{isPurchaseOrder}")]
        public async Task<IActionResult> GetNewPurchaseOrderNumber(bool isPurchaseOrder)
        {
            var getNewPurchaseOrderNumberQuery = new GetNewPurchaseOrderNumberQuery
            {
                isPurchaseOrder = isPurchaseOrder
            };
            var response = await _mediator.Send(getNewPurchaseOrderNumberQuery);
            return Ok(new
            {
                OrderNumber = response
            });
        }

        /// <summary>
        /// Get Purchase Order Items.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="isReturn"></param>
        /// <returns></returns>
        [HttpGet("{id}/items")]
        [ClaimCheck("PO_VIEW_PURCHASE_ORDERS", "PO_RETURN_PO", "POR_VIEW_PO_REQUESTS", "REP_PO_REP")]
        public async Task<IActionResult> GetPurchaseOrderItems(Guid id, bool isReturn = false)
        {
            var getPurchaseOrderItemsCommand = new GetPurchaseOrderItemsCommand { Id = id, IsReturn = isReturn };
            var response = await _mediator.Send(getPurchaseOrderItemsCommand);
            return Ok(response);
        }

        /// <summary>
        /// Delete Purchase Order
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPut("{id}/markasreceived")]
        [ClaimCheck("PO_UPDATE_PO")]
        public async Task<IActionResult> MarkPurchaseOrderAsReceived(Guid id)
        {
            var deletePurchaseOrderCommand = new MarkParchaseOrderAsReceivedCommand { Id = id };
            var response = await _mediator.Send(deletePurchaseOrderCommand);
            return ReturnFormattedResponse(response);
        }

        /// <summary>
        /// Get Purchase Order Items.
        /// </summary>
        /// <param name="purchaseOrderResource"></param>
        /// <returns></returns>
        [HttpGet("items/reports")]
        [ClaimCheck("REP_PRO_PP_REP")]
        public async Task<IActionResult> GetPurchaseOrderItems([FromQuery] PurchaseOrderResource purchaseOrderResource)
        {
            var getPurchaseOrderItemsCommand = new GetPurchaseOrderItemsReportCommand { PurchaseOrderResource = purchaseOrderResource };
            var response = await _mediator.Send(getPurchaseOrderItemsCommand);

            var paginationMetadata = new
            {
                totalCount = response.TotalCount,
                pageSize = response.PageSize,
                skip = response.Skip,
                totalPages = response.TotalPages
            };

            Response.Headers.Append("X-Pagination",
                Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(response);

        }

        /// <summary>
        /// Get Recent Expected Date Purchase Order
        /// </summary>
        /// <returns></returns>
        [HttpGet("recentdelivery")]
        [ClaimCheck("DB_RECENT_PO_DELIVERY")]
        public async Task<IActionResult> GetRecentExpectedDatePurchaseOrder()
        {
            var getPurchaseOrderRecentDeliveryScheduleQuery = new GetPurchaseOrderRecentDeliveryScheduleQuery
            {
            };
            var serviceResponse = await _mediator.Send(getPurchaseOrderRecentDeliveryScheduleQuery);
            return Ok(serviceResponse);
        }

        /// <summary>
        /// Get Purchase order profit and loss Report
        /// </summary>
        /// <param name="purchaseOrderResource"></param>
        /// <returns></returns>
        [HttpGet("items/profitLoss")]
        [ClaimCheck("REP_VIEW_PRO_LOSS_REP")]
        public async Task<IActionResult> GetPurchaseOrderProfitLossReport([FromQuery] PurchaseOrderResource purchaseOrderResource)
        {
            var getSaleOrderProfitLossCommand = new GetPurchaseOrderProfitLossCommand
            {
                FromDate = purchaseOrderResource.FromDate.Value,
                ToDate = purchaseOrderResource.ToDate.Value,
                LocationId = purchaseOrderResource.LocationId
            };

            var response = await _mediator.Send(getSaleOrderProfitLossCommand);
            return Ok(response);
        }


        /// <summary>
        /// get purchase order total
        /// </summary>
        /// <param name="purchaseOrderResource"></param>
        /// <returns></returns>
        [HttpGet("total")]
        [ClaimCheck("REP_VIEW_INPUT_TAX_REP")]
        public async Task<IActionResult> GetPurchaseOrderTotal([FromQuery] PurchaseOrderResource purchaseOrderResource)
        {
            var getSaleOrderProfitLossCommand = new GetPurchaseOrdersTotalCommand
            {
                PurchaseOrderResource = purchaseOrderResource
            };

            var response = await _mediator.Send(getSaleOrderProfitLossCommand);
            return Ok(response);
        }


        /// <summary>
        /// get purchase order tax Item total
        /// </summary>
        /// <param name="purchaseOrderResource"></param>
        /// <returns></returns>
        [HttpGet("tax-item-total")]
        [ClaimCheck("REP_VIEW_INPUT_TAX_REP")]
        public async Task<IActionResult> GetPurchaseOrderTaxItemTotal([FromQuery] PurchaseOrderResource purchaseOrderResource)
        {
            var getSaleOrderProfitLossCommand = new GetPurchaseOrderTaxItemTotalCommand
            {
                PurchaseOrderResource = purchaseOrderResource
            };

            var response = await _mediator.Send(getSaleOrderProfitLossCommand);
            return Ok(response);
        }

        /// <summary>
        /// get purchase order tax items
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}/tax-item")]
        [ClaimCheck("REP_VIEW_INPUT_TAX_REP")]
        public async Task<IActionResult> GetPurchaseOrderTaxItem(Guid id)
        {
            var getSaleOrderProfitLossCommand = new GetPurchaseOrderTaxItemCommand
            {
                Id = id
            };

            var response = await _mediator.Send(getSaleOrderProfitLossCommand);
            return Ok(response);
        }
    }
}
