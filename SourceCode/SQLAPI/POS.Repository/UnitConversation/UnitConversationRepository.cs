using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto.Unit;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class UnitConversationRepository(
        IUnitOfWork<POSDbContext> uow) : GenericRepository<UnitConversation, POSDbContext>(uow), IUnitConversationRepository
    {

        public async Task<BaseUnitConversionResultDto> GetBaseUnitValuesAsync(Guid unitId, decimal quantity,decimal unitPrice)
        {
            var unit =await All.Include(c => c.Parent)
                .FirstOrDefaultAsync(c => c.Id == unitId);

            decimal _baseQuantity = 0;
            decimal _baseUnitPrice = 0;
            Guid _unitId;
            if (unit.ParentId.HasValue && unit.Operator.HasValue && unit.Value.HasValue)
            {
                _unitId = unit.ParentId.Value;
                switch (unit.Operator)
                {
                    case Operator.Plush:
                        _baseQuantity = quantity + unit.Value.Value;
                        _baseUnitPrice = unitPrice - unit.Value.Value;
                        break;
                    case Operator.Minus:
                        _baseQuantity = quantity - unit.Value.Value;
                        _baseUnitPrice = unitPrice + unit.Value.Value;
                        break;
                    case Operator.Multiply:
                        _baseQuantity = quantity * unit.Value.Value;
                        _baseUnitPrice = unitPrice / unit.Value.Value;
                        break;
                    case Operator.Divide:
                        _baseQuantity = quantity / unit.Value.Value;
                        _baseUnitPrice = unitPrice * unit.Value.Value;
                        break;
                    default:
                        break;
                }
            }
            else
            {
                _baseQuantity = quantity;
                _baseUnitPrice = unitPrice;
                _unitId=unitId;
            }
           var dto= new BaseUnitConversionResultDto
            {
                BaseQuantity = _baseQuantity,
                BaseUnitPrice = _baseUnitPrice,
                UnitId = _unitId,
            };
            return  dto;
        }
    }
}
