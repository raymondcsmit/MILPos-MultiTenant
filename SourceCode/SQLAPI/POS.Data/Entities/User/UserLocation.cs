using System;


namespace POS.Data.Entities
{
    public class UserLocation
    {
        public Guid UserId { get; set; }
        public Guid LocationId { get; set; }
        public User User { get; set; }
        public Location Location { get; set; }

    }
}
