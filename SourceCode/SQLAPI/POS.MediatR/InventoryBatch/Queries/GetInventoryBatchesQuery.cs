using MediatR;
using POS.Data.Entities.Inventory;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR.InventoryBatch.Queries
{
    public class GetInventoryBatchesQuery : IRequest<ServiceResponse<List<Data.Entities.Inventory.InventoryBatch>>>
    {
        public Guid ProductId { get; set; }
    }
}
