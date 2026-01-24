using MediatR;

namespace POS.MediatR;
public class UpdateActivatedLicenseCommand : IRequest<bool>
{
    public string PurchaseCode { get; set; }
    public string LicenseKey { get; set; }
}
