using POS.Data.Entities;
using POS.Data.Resources;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Resources
{
    public class ReminderResource : ResourceParameters
    {
        public ReminderResource() : base("CreatedDate")
        {
        }
        public string Subject { get; set; }
        public string Message { get; set; }
        public Frequency? Frequency { get; set; }
    }
}
