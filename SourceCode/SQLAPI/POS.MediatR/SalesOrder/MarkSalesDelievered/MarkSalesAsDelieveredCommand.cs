using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Helper;

namespace POS.MediatR.SalesOrder.Commands
{
	public class MarkSalesAsDelieveredCommand : IRequest<ServiceResponse<bool>>
	{
		public Guid Id { get; set; }
	}
}
