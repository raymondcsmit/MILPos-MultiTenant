using System;
using MediatR;
using POS.Helper;

namespace POS.MediatR.Accouting;
public class DeleteFinancialYearCommand : IRequest<ServiceResponse<bool>>
{
    public Guid Id { get; set; }
}
