using AutoMapper;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.MediatR;

namespace POS.API.Helpers.Mapping
{
    public class LedgerAccountProfile:Profile
    {
        public LedgerAccountProfile()
        {
            CreateMap<LedgerAccount, LedgerAccountDto>().ReverseMap();
            CreateMap<AddLedgerAccountCommand, LedgerAccount>();
        }
    }
}
