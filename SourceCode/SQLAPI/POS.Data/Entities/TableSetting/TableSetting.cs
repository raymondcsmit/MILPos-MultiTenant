using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using POS.Data.Dto;


namespace POS.Data.Entities
{
    public class TableSetting
    {
        [Key]
        public Guid Id { get; set; }
        [Required]
        public string ScreenName { get; set; }
        public Guid UserId { get; set; }

        [NotMapped]
        public List<TableSettingJson> Settings { get; set; } = new List<TableSettingJson>();

        // Backing field to store JSON in the database
        public string SettingsJson
        {
            get => Settings == null ? null : JsonSerializer.Serialize(Settings);
            set => Settings = string.IsNullOrEmpty(value) ? new List<TableSettingJson>() : JsonSerializer.Deserialize<List<TableSettingJson>>(value);
        }
    }
}
