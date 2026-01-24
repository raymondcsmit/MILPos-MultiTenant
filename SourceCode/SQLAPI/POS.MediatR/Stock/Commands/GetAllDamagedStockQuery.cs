using MediatR;
using POS.Data.Resources;
using POS.Repository.Stock;

namespace POS.MediatR.Stock.Commands
{
    public class GetAllDamagedStockQuery : IRequest<DamagedStockList>
    {
        public DamagedStockResource DamagedStockResource { get; set; }
    }

}
