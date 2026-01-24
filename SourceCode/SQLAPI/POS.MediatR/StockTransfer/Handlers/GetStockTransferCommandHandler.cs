using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.Commands;
using POS.Repository;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class GetStockTransferCommandHandler(IStockTransferRepository _stockTransferRepository, ILogger<GetStockTransferCommand> _logger, IMapper _mapper, PathHelper _pathHelper) : IRequestHandler<GetStockTransferCommand, ServiceResponse<StockTransferDto>>
    {
        public async Task<ServiceResponse<StockTransferDto>> Handle(GetStockTransferCommand request, CancellationToken cancellationToken)
        {
            var entity = await _stockTransferRepository
                .All
                .Include(c => c.StockTransferItems)
                    .ThenInclude(u => u.Unit)
                .Include(c => c.StockTransferItems)
                    .ThenInclude(p => p.Product)
                .Include(f => f.FromLocation)
                .Include(t => t.ToLocation)

                .FirstOrDefaultAsync(d => d.Id == request.Id);

            if (entity == null)
            {
                _logger.LogError("stock transfter is not exists");
                return ServiceResponse<StockTransferDto>.Return404();
            }

            var entityDto = _mapper.Map<StockTransferDto>(entity);
            foreach (var item in entityDto.StockTransferItems)
            {
                if (item.Product != null && !string.IsNullOrEmpty(item.Product.ProductUrl))
                {
                    item.Product.ProductUrl = Path.Combine(_pathHelper.ProductThumbnailImagePath, item.Product.ProductUrl);
                }
            }
            return ServiceResponse<StockTransferDto>.ReturnResultWith200(entityDto);
        }
    }
}
