using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.TableSetting.Commands;
using POS.Repository;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.TableSetting.Handlers
{
    public class AddOrUpdateTableSettingCommandHandler(
        ITableSettingRepository tableSettingRepository,
        IMapper mapper,
        UserInfoToken userInfoToken,
        IUnitOfWork<POSDbContext> _uow) : IRequestHandler<AddOrUpdateTableSettingCommand, ServiceResponse<TableSettingDto>>
    {
        public async Task<ServiceResponse<TableSettingDto>> Handle(AddOrUpdateTableSettingCommand request, CancellationToken cancellationToken)
        {
            var tableSetting = await tableSettingRepository.All.Where(c => c.ScreenName == request.ScreenName && c.UserId == userInfoToken.Id).FirstOrDefaultAsync();
            if (tableSetting != null)
            {
                tableSetting.Settings = request.Settings;
                tableSettingRepository.Update(tableSetting);
            }
            else
            {
                tableSetting = new POS.Data.Entities.TableSetting
                {
                    ScreenName = request.ScreenName,
                    UserId = userInfoToken.Id,
                    Settings = request.Settings
                };
                tableSettingRepository.Add(tableSetting);
            }
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<TableSettingDto>.Return500();
            }
            var tableSettingDto = mapper.Map<TableSettingDto>(tableSetting);
            return ServiceResponse<TableSettingDto>.ReturnResultWith200(tableSettingDto);
        }
    }
}