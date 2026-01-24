namespace POS.Data.Dto
{
    public class TableSettingJson
    {
        public string Key { get; set; }
        public string Header { get; set; }
        public int Width { get; set; }
        public string Type { get; set; }
        public bool IsVisible { get; set; }
        public int OrderNumber { get; set; }
        public bool AllowSort { get; set; }
    }
}
