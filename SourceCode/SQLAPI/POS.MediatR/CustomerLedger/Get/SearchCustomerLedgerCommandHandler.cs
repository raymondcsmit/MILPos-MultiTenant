using Amazon.Runtime.Internal.Util;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Helper;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class SearchCustomerLedgerCommandHandler(
        ICustomerRepository customerRepository,
        ILogger<SearchCustomerLedgerCommandHandler> _logger) : IRequestHandler<SearchCustomerLedgerCommand, ServiceResponse<List<LedgerDto>>>
    {
        public async Task<ServiceResponse<List<LedgerDto>>> Handle(SearchCustomerLedgerCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var customersQuery = customerRepository.All;

                if (!string.IsNullOrWhiteSpace(request.SearchQuery))
                {
                    string search = request.SearchQuery.Trim();
                    customersQuery = customersQuery.Where(c => EF.Functions.Like(c.CustomerName, $"{search}%"));
                }

                var result = await customersQuery
                    .Select(c => new LedgerDto
                    {
                        Id = c.Id,
                        Name = c.CustomerName,
                        IsCustomer = true,
                    })
                    .OrderBy(c => c.Name)
                .ToListAsync(cancellationToken);

                return ServiceResponse<List<LedgerDto>>.ReturnResultWith200(result);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while geting Customerledger");
                return ServiceResponse<List<LedgerDto>>.Return500("error while geting Customerledger");
            }

        }
    }
}
