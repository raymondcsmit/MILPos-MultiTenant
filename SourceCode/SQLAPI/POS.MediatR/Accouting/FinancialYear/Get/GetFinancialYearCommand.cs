using System;
using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;

namespace POS.MediatR.Accouting;
public class GetFinancialYearCommand : IRequest<ServiceResponse<FinancialYearDto>>
{
    public Guid Id { get; set; }
}