using System;
using System.Collections.Generic;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.Stock.Commands
{
    public class AddDamagedStockCommand : IRequest<ServiceResponse<List<DamagedStockDto>>>
    {
        public string Reason { get; set; }
        public Guid ReportedId { get; set; }
        public Guid LocationId { get; set; }
        public DateTime DamagedDate { get; set; }
        public List<DamagedStockItemDto> DamagedStockItems { get; set; }
       
    }
}
