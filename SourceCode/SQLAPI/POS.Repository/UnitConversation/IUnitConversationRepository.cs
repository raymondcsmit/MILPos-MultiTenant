using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Dto.Unit;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface IUnitConversationRepository : IGenericRepository<UnitConversation>
    {
        public Task<BaseUnitConversionResultDto> GetBaseUnitValuesAsync(Guid unitId, decimal quantity,decimal unitPrice);
    }
}
