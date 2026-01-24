using System;
using System.Collections.Generic;

namespace POS.Data.Dto
{
    public class UserInfoToken
    {
        public Guid Id { get; set; }
        public string Email { get; set; }
        public string ConnectionId { get; set; }
        public List<Guid> LocationIds { get; set; } = [];
    }
}
