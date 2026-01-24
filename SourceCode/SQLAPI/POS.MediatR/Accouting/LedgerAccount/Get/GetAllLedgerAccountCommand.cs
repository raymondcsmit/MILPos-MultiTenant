using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR;
public class GetAllLedgerAccountCommand : IRequest<ServiceResponse<List<LedgerAccountDto>>>
{
    public Guid BranchId { get; set; }
}