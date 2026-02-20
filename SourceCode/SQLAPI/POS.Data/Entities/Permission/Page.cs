using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class Page : BaseEntity
    {
        public string Name { get; set; }
        public int Order { get; set; }
        public List<Action> Actions { get; set; }
    }
}
