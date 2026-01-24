using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.MediatR;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.SalesOrder.Commands;
using POS.MediatR.SalesOrder.Get;
using POS.MediatR.SalesOrder.Invoice;
using POS.MediatR.SalesOrder.Report;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.API.Controllers.SalesOrder
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SalesOrderController : BaseController
    {
        public IMediator _mediator { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="SalesOrderController"/> class.
        /// </summary>
        /// <param name="mediator">The mediator.</param>
        public SalesOrderController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Gets all sales order.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("SO_VIEW_SALES_ORDERS", "SO_RETURN_SO", "REP_SO_REP", "REP_VIEW_OUTPUT_TAX_REP", "SOR_VIEW_SO_REQUESTS")]
        [Produces("application/json", "application/xml", Type = typeof(List<SalesOrderDto>))]
        public async Task<IActionResult> GetAllSalesOrder([FromQuery] SalesOrderResource salesOrderResource)
        {
            var getAllSalesOrderQuery = new GetAllSalesOrderCommand
            {
                SalesOrderResource = salesOrderResource
            };
            var salesOrders = await _mediator.Send(getAllSalesOrderQuery);

            var paginationMetadata = new
            {
                totalCount = salesOrders.TotalCount,
                pageSize = salesOrders.PageSize,
                skip = salesOrders.Skip,
                totalPages = salesOrders.TotalPages
            };

            Response.Headers.Append("X-Pagination",
                Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(salesOrders);
        }
        /// <summary>
        /// Return Sale Order 
        /// </summary>
        /// <param name="salesOrderResource"></param>
        /// <returns></returns>
        [HttpGet("returns")]
        [ClaimCheck("SO_VIEW_SALES_ORDERS", "SO_RETURN_SO", "REP_SO_REP", "REP_VIEW_OUTPUT_TAX_REP", "SOR_VIEW_SO_REQUESTS")]
        [Produces("application/json", "application/xml", Type = typeof(List<SalesOrderDto>))]
        public async Task<IActionResult> GetAllSalesOrdersReturn([FromQuery] SalesOrderResource salesOrderResource)
        {
            var getAllSalesOrderReturnsCommand = new GetAllSalesOrderReturnsCommand
            {
                SalesOrderResource = salesOrderResource
            };
            var salesOrders = await _mediator.Send(getAllSalesOrderReturnsCommand);

            var paginationMetadata = new
            {
                totalCount = salesOrders.TotalCount,
                pageSize = salesOrders.PageSize,
                skip = salesOrders.Skip,
                totalPages = salesOrders.TotalPages
            };

            Response.Headers.Append("X-Pagination",
                Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(salesOrders);
        }

        /// <summary>
        /// Get Sales Order.
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        [ClaimCheck("SO_GENERATE_INVOICE", "SO_VIEW_SO_DETAIL", "SO_UPDATE_SO",
            "SO_RETURN_SO", "REP_SO_REP", "REP_PRO_SO_REPORT", "SO_RETURN_SO",
            "SOR_UPDATE_SO_REQUEST", "SOR_SOR_DETAIL", "SOR_CONVERT_TO_SO", "SOR_GENERATE_INVOICE")]
        [Produces("application/json", "application/xml", Type = typeof(List<SalesOrderDto>))]
        public async Task<IActionResult> GetSalesOrder(Guid id)
        {
            var getSalesOrderQuery = new GetSalesOrderCommand
            {
                Id = id
            };
            var salesOrder = await _mediator.Send(getSalesOrderQuery);
            return ReturnFormattedResponse(salesOrder);
        }
        /// <summary>
        /// Return Sales Items Returns
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}/returnItems")]
        [Produces("application/json", "application/xml", Type = typeof(List<SalesOrderDto>))]
        public async Task<IActionResult> GetSalesOrderReturnItems(Guid id)
        {
            var getSalesOrderWithReturnItemsCommand = new GetSalesOrderWithReturnItemsCommand
            {
                Id = id
            };
            var salesOrderItems = await _mediator.Send(getSalesOrderWithReturnItemsCommand);
            return Ok(salesOrderItems);
        }


        /// <summary>
        /// Creates the sales order.
        /// </summary>
        /// <param name="addSalesOrderCommand">The add sales order command.</param>
        /// <returns></returns>
        [HttpPost, DisableRequestSizeLimit]
        [ClaimCheck("SO_ADD_SO", "POS_POS", "SOR_ADD_SO_REQUEST")]
        [Produces("application/json", "application/xml", Type = typeof(SalesOrderDto))]
        public async Task<IActionResult> CreateSalesOrder(AddSalesOrderCommand addSalesOrderCommand)
        {
            var result = await _mediator.Send(addSalesOrderCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Update the Sales order.
        /// </summary>
        /// <param name="updateSalesOrderCommand">The add Sales order command.</param>
        /// <returns></returns>
        [HttpPut("{id}")]
        [ClaimCheck("SO_UPDATE_SO", "SOR_UPDATE_SO_REQUEST", "SOR_CONVERT_TO_SO")]
        [Produces("application/json", "application/xml", Type = typeof(SalesOrderDto))]
        public async Task<IActionResult> UpdateSalesOrder(Guid id, UpdateSalesOrderCommand updateSalesOrderCommand)
        {
            var result = await _mediator.Send(updateSalesOrderCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Update the Sales order return.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="updateSalesOrderReturnCommand">The add Sales order command.</param>
        /// <returns></returns>
        [HttpPut("{id}/return")]
        [ClaimCheck("SO_RETURN_SO")]
        [Produces("application/json", "application/xml")]
        public async Task<IActionResult> UpdateSalesOrderReturn(Guid id, UpdateSalesOrderReturnCommand updateSalesOrderReturnCommand)
        {
            var result = await _mediator.Send(updateSalesOrderReturnCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Delete Sales Order
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        [ClaimCheck("SO_DELETE_SO", "SOR_DELETE_SO_REQUEST")]
        public async Task<IActionResult> DeleteSalesOrder(Guid id)
        {
            var deleteSalesOrderCommand = new DeleteSalesOrderCommand
            {
                Id = id
            };
            var response = await _mediator.Send(deleteSalesOrderCommand);
            return Ok(response);
        }

        /// <summary>
        /// Gets the new Sales order number.
        /// </summary>
        /// <returns></returns>
        [HttpGet("newOrderNumber/{isSalesOrderRequest}")]
        public async Task<IActionResult> GetNewSalesOrderNumber(bool isSalesOrderRequest)
        {
            var getNewSalesOrderNumberQuery = new GetNewSalesOrderNumberCommand { IsSalesOrderRequest = isSalesOrderRequest };
            var response = await _mediator.Send(getNewSalesOrderNumberQuery);
            return Ok(new
            {
                OrderNumber = response
            });
        }


        /// <summary>
        /// Get Sales order Items
        /// </summary>
        /// <param name="id"></param>
        /// <param name="isReturn"></param>
        /// <returns></returns>
        [HttpGet("{id}/items")]
        [ClaimCheck("SO_VIEW_SALES_ORDERS", "SO_RETURN_SO", "REP_SO_REP", "SOR_VIEW_SO_REQUESTS")]
        [Produces("application/json", "application/xml", Type = typeof(List<SalesOrderItemTaxDto>))]
        public async Task<IActionResult> GetSalesOrderItems(Guid id, bool isReturn = false)
        {
            var getSalesOrderQuery = new GetSalesOrderItemsCommand { Id = id, IsReturn = isReturn };
            var salesOrderItems = await _mediator.Send(getSalesOrderQuery);
            return Ok(salesOrderItems);
        }

        /// <summary>
        /// Get Sales Item report.
        /// </summary>
        /// <param name="salesOrderResource"></param>
        /// <returns></returns>
        [HttpGet("items/reports")]
        [ClaimCheck("REP_PRO_SO_REPORT")]
        public async Task<IActionResult> GetSalesOrderItems([FromQuery] SalesOrderResource salesOrderResource)
        {
            var getSalesOrderItemsReportCommand = new GetSalesOrderItemsReportCommand { SalesOrderResource = salesOrderResource };
            var response = await _mediator.Send(getSalesOrderItemsReportCommand);

            var paginationMetadata = new
            {
                totalCount = response.TotalCount,
                pageSize = response.PageSize,
                skip = response.Skip,
                totalPages = response.TotalPages
            };

            Response.Headers.Append("X-Pagination", Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(response);

        }

        /// <summary>
        /// mark as delivered
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPut("{id}/markasdelivered")]
        [Produces("application/json", "application/xml")]
        [ClaimCheck("SO_UPDATE_SO")]
        public async Task<IActionResult> MarkSalesOrderAsDelivered(Guid id)
        {
            var command = new MarkSalesAsDelieveredCommand { Id = id };
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Get Recent Shipment.
        /// </summary>
        /// <returns></returns>
        [HttpGet("recentshipment")]
        [ClaimCheck("DB_RECENT_SO_SHIPMENT")]
        public async Task<IActionResult> GetRecentExpectedShipmentDateSalesOrder()
        {
            var getSalesOrderRecentShipmentDateQuery = new GetSalesOrderRecentShipmentDateQuery { };
            var serviceResponse = await _mediator.Send(getSalesOrderRecentShipmentDateQuery);
            return Ok(serviceResponse);
        }

        /// <summary>
        /// Get Sales order profit and loss Report.
        /// </summary>
        /// <param name="saleOrderProfitLossCommand"></param>
        /// <returns></returns>
        [HttpGet("items/profitLoss")]
        [ClaimCheck("REP_VIEW_PRO_LOSS_REP")]
        public async Task<IActionResult> GetSalesOrderProfitLossReport([FromQuery] GetSaleOrderProfitLossCommand saleOrderProfitLossCommand)
        {
            var response = await _mediator.Send(saleOrderProfitLossCommand);
            return Ok(response);
        }

        /// <summary>
        /// get sales order total
        /// </summary>
        /// <param name="salesOrderResource"></param>
        /// <returns></returns>
        [HttpGet("total")]
        [ClaimCheck("REP_VIEW_OUTPUT_TAX_REP")]
        public async Task<IActionResult> GetSalesOrderTotal([FromQuery] SalesOrderResource salesOrderResource)
        {
            var getSaleOrderProfitLossCommand = new GetSalesOrdersTotalCommand
            {
                SalesOrderResource = salesOrderResource
            };

            var response = await _mediator.Send(getSaleOrderProfitLossCommand);
            return Ok(response);
        }


        /// <summary>
        /// get sales order tax Item total
        /// </summary>
        /// <param name="salesOrderResource"></param>
        /// <returns></returns>
        [HttpGet("tax-item-total")]
        [ClaimCheck("REP_VIEW_OUTPUT_TAX_REP")]
        public async Task<IActionResult> GetSalesOrderTaxItemTotal([FromQuery] SalesOrderResource salesOrderResource)
        {
            var getSaleOrderProfitLossCommand = new GetSalesOrderTaxItemTotalCommand
            {
                SalesOrderResource = salesOrderResource
            };

            var response = await _mediator.Send(getSaleOrderProfitLossCommand);
            return Ok(response);
        }

        /// <summary>
        /// get sales order tax items
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}/tax-item")]
        [ClaimCheck("REP_VIEW_OUTPUT_TAX_REP")]
        public async Task<IActionResult> GetSalesOrderTaxItem(Guid id)
        {
            var getSaleOrderProfitLossCommand = new GetSalesOrderTaxItemCommand
            {
                Id = id
            };

            var response = await _mediator.Send(getSaleOrderProfitLossCommand);
            return Ok(response);
        }

        /// <summary>
        /// get all Pendinhg Sales order 
        /// </summary>
        /// <param name="pendingSalesOrderResource"></param>
        /// <returns></returns>
        [HttpGet("pendingsalesorder")]
        public async Task<IActionResult> GetAllPendingSalesOrderList([FromQuery] PendingSalesOrderResource pendingSalesOrderResource)
        {
            var GetGeneralEntryList = new GetPendingSalesOrderCommand()
            {
                pendingSalesOrderResource = pendingSalesOrderResource
            };
            var result = await _mediator.Send(GetGeneralEntryList);
            var paginationMetadata = new
            {
                totalCount = result.TotalCount,
                pageSize = result.PageSize,
                skip = result.Skip,
                totalPages = result.TotalPages
            };
            Response.Headers.Append("X-Pagination",
                Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(result);
        }

        /// <summary>
        /// get Customer Pending sales order 
        /// </summary>
        /// <param name="customerId"></param>
        /// <returns></returns>
        [HttpGet("customerpendingpayment/{customerId}")]
        [ClaimCheck("CUST_VIEW_CUSTOMER_PENDING_PAYMENTS")]
        public async Task<IActionResult> GetCustomerPendingSO(Guid customerId)
        {

            var response = await _mediator.Send(new GetCustomerPendingSalesOrderCommand() { CustomerId = customerId });
            return GenerateResponse(response);
        }

    }
}

