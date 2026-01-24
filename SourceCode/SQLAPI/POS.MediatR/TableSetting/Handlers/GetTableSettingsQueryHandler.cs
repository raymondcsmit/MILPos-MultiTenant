using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.MediatR.TableSetting.Commands;
using POS.Repository;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.TableSetting.Handlers
{
    public class GetTableSettingsQueryHandler(ITableSettingRepository tableSettingReposistory, IMapper mapper, UserInfoToken userInfoToken) : IRequestHandler<GetTableSettingsQuery, TableSettingDto>
    {
        public async Task<TableSettingDto> Handle(GetTableSettingsQuery request, CancellationToken cancellationToken)
        {
            var tableSetting = await tableSettingReposistory.All.Where(c => c.ScreenName == request.ScreenName && c.UserId == userInfoToken.Id).FirstOrDefaultAsync();

            if (tableSetting == null)
            {
                return new TableSettingDto();
            }
            else
            {
                return mapper.Map<TableSettingDto>(tableSetting);
            }
        }
    }
}