using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Helper;
using POS.Repository.Accouting;

namespace POS.MediatR.Accouting
{
    public class GetTransactionItemsCommandHandler(
        ITransactionItemRepository _transactionItemRepository,
        IMapper _mapper,
        ILogger<GetTransactionItemsCommandHandler> _logger
        ) : IRequestHandler<GetTransactionItemsCommand, ServiceResponse<List<TransactionItemDataDto>>>
    {
        public async Task<ServiceResponse<List<TransactionItemDataDto>>> Handle(GetTransactionItemsCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var transactionItems = await _transactionItemRepository.All.Include(c => c.InventoryItem)
                    .Where(c => c.TransactionId == request.TransactionId).ToListAsync(cancellationToken);
                var transactionItemsDtos = _mapper.Map<List<TransactionItemDataDto>>(transactionItems);
                return ServiceResponse<List<TransactionItemDataDto>>.ReturnResultWith200(transactionItemsDtos);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting Transaction items");
                return ServiceResponse<List<TransactionItemDataDto>>.Return500("error while getting Transaction Items");
            }
        }
    }
}
