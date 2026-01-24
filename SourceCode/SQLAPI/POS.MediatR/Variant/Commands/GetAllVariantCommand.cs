using Azure.Core;
using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Variant
{
    public class GetAllVariantCommand : IRequest<ServiceResponse<List<VariantDto>>>
    {

    }
}
