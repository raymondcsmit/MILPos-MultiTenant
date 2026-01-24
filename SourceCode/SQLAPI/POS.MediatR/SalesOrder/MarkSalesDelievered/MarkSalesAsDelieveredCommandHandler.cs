using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data;
using POS.Domain;
using POS.Helper;
using POS.MediatR;
using POS.Repository;
using Microsoft.EntityFrameworkCore;
using POS.MediatR.SalesOrder.Commands;

namespace POS.MediatR.SalesOrder.Handlers
{
	public class MarkSalesAsDelieveredCommandHandler(
	  ISalesOrderRepository salesOrderRepository,
	  IUnitOfWork<POSDbContext> uow,
	  ILogger<MarkSalesAsDelieveredCommandHandler> logger)
	  : IRequestHandler<MarkSalesAsDelieveredCommand, ServiceResponse<bool>>
	{
		public async Task<ServiceResponse<bool>> Handle(MarkSalesAsDelieveredCommand request, CancellationToken cancellationToken)
		{
			var salesOrder = await salesOrderRepository.All
				.Include(d => d.SalesOrderItems)
				.ThenInclude(t => t.SalesOrderItemTaxes)
				.Where(c => c.Id == request.Id).FirstOrDefaultAsync();

			if (salesOrder == null)
			{
				logger.LogError("SalesOrder order does not exists.");
				return ServiceResponse<bool>.Return404();
			}

			if (salesOrder.DeliveryStatus == SalesDeliveryStatus.DELIVERED)
			{
				return ServiceResponse<bool>.ReturnSuccess();
			}

			salesOrder.DeliveryStatus = SalesDeliveryStatus.DELIVERED;

			salesOrderRepository.Update(salesOrder);

			if (await uow.SaveAsync() <= 0)
			{
				logger.LogError("Error while updating SalesOrder Order.");
				return ServiceResponse<bool>.Return500();
			}

			return ServiceResponse<bool>.ReturnSuccess();
		}
	}
}
