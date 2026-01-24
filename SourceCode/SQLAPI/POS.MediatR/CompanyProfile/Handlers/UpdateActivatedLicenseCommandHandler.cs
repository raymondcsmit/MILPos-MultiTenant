using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Repository;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR;
internal class UpdateActivatedLicenseCommandHandler(ICompanyProfileRepository companyProfileRepository, IUnitOfWork<POSDbContext> _uow) : IRequestHandler<UpdateActivatedLicenseCommand, bool>
{
    public async Task<bool> Handle(UpdateActivatedLicenseCommand request, CancellationToken cancellationToken)
    {
        var companyProfile = await companyProfileRepository.All.FirstOrDefaultAsync();
        if (companyProfile == null)
        {
            return false; // Company profile not found
        }
        companyProfile.PurchaseCode = request.PurchaseCode;
        companyProfile.LicenseKey = request.LicenseKey;
        companyProfileRepository.Update(companyProfile);
        if (await _uow.SaveAsync() <= -1)
        {
            return false;
        }
        return true;
    }
}
