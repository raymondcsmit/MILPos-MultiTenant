using AutoMapper;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.MediatR.Accouting;

namespace POS.API.Helpers.Mapping
{
    public class FinancialYearProfile:Profile
    {
        public FinancialYearProfile()
        {
            CreateMap<AddFinancialYearCommand, FinancialYear>();
            CreateMap<UpdateFinancialYearCommand, FinancialYear>();
            CreateMap<FinancialYear, FinancialYearDto>();

        }
    }
}
