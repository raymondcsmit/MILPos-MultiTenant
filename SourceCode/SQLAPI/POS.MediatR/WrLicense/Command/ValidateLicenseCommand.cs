using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.WrLicense.Command
{
    public class ValidateLicenseCommand : IRequest<ServiceResponse<UserAuthDto>>
    {
        public string PurchaseCode { get; set; }
    }
}
