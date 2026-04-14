using System;

namespace POS.Data
{
    public interface ISoftDelete
    {
        bool IsDeleted { get; set; }
    }
}
