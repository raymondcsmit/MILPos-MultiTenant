using System;

namespace POS.Data
{
    public class Currency : SharedBaseEntity
    {
        public string Name { get; set; }
        public string Symbol { get; set; }
    }
}
