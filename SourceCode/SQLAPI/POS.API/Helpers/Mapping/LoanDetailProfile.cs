using AutoMapper;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;

namespace POS.API.Helpers.Mapping;

public class LoanDetailProfile : Profile
{
    /// <summary>
    /// Constructor
    /// </summary>
    public LoanDetailProfile()
    {
        CreateMap<LoanDetail, LoanDetailDto>().ReverseMap();
    }
}

