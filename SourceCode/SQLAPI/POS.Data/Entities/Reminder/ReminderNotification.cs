using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class ReminderNotification : BaseEntity
    {
        public Guid ReminderId { get; set; }
        public string Subject { get; set; }
        public string Description { get; set; }
        public DateTime FetchDateTime { get; set; }
        public bool IsEmailNotification { get; set; }
        [ForeignKey("ReminderId")]
        public Reminder Reminder { get; set; }
    }
}
