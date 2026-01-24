using AutoMapper;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.CommandAndQuery;
using System;

namespace POS.API.Helpers
{
    public class TableSettingProfile: Profile
    {
        public TableSettingProfile()
        {
            CreateMap<TableSetting, TableSettingDto>().ReverseMap();

        }
    }
}
