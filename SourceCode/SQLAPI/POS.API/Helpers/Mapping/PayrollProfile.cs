using AutoMapper;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.MediatR.Accouting;

namespace POS.API.Helpers.Mapping
{
    public class PayrollProfile:Profile
    {
        public PayrollProfile()
        {
            CreateMap<AddPayrollCommand, Payroll>();
            CreateMap<Payroll, PayrollDto>();
        }
    }
}
