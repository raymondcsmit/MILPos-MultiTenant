using System;
using System.Collections.Generic;
using MediatR;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Helper;

namespace POS.MediatR
{
    public class AddProductStockCommand : IRequest<ServiceResponse<bool>>
    {
        public decimal? CurrentStock { get; set; }
        public decimal PricePerUnit { get; set; }
        public Guid LocationId { get; set; }
        public Guid ProductId { get; set; }
        public Guid UnitId { get; set; }
        public List<ProductTaxDto> ProductTaxes { get; set; }
        public List<Guid> TaxIds { get; set; } = [];
        public ACCPaymentMethod PaymentMethod { get; set; } = ACCPaymentMethod.Cash;
        public string ReferenceNumber { get; set; }
    }

}
