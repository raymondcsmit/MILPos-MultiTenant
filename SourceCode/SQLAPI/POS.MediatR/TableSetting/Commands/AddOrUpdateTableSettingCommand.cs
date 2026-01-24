using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.TableSetting.Commands
{
    public class AddOrUpdateTableSettingCommand : IRequest<ServiceResponse<TableSettingDto>>
    {
        public string ScreenName { get; set; }
        public List<TableSettingJson> Settings { get; set; } = new List<TableSettingJson>();
    }
}
