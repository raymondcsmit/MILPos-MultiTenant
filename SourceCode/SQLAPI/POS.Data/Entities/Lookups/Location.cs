using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace POS.Data.Entities
{
    public class Location: BaseEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string ContactPerson { get; set; }
        public string Website { get; set; }
        [Required]
        [MaxLength(500)]
        public string FBRKey { get; set; } // Encrypted in database

        [Required]
        [MaxLength(20)]
        public string POSID { get; set; } // POS Machine ID

        // API Configuration
        [Required]
        [MaxLength(200)]
        public string ApiBaseUrl { get; set; } // Sandbox or Production URL
        
        public bool IsFBREnabled { get; set; } = false;
        
        public bool AutoSubmitInvoices { get; set; } = true;

        public virtual ICollection<UserLocation> UserLocations { get; set; }
    }
}
