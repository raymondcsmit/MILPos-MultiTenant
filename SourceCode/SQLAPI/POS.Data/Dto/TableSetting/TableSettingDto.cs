using System;
using System.Collections.Generic;

namespace POS.Data.Dto
{
    public class TableSettingDto
    {
        public Guid Id { get; set; }
        public string ScreenName { get; set; }
        public List<TableSettingJson> Settings { get; set; } = new List<TableSettingJson>();
    }
}
