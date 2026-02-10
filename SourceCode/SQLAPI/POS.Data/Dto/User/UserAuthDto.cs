using System;
using System.Collections.Generic;

namespace POS.Data.Dto;

public class UserAuthDto
{
    public UserAuthDto()
    {
        BearerToken = string.Empty;
    }
    public Guid Id { get; set; }
    public string UserName { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string BearerToken { get; set; }
    public bool IsAuthenticated { get; set; }
    public string ProfilePhoto { get; set; }
    public bool IsSuperAdmin { get; set; }
    public List<string> Claims { get; set; }
    public string LicenseKey { get; set; }
    public string PurchaseCode { get; set; }
    public bool HasAllLocationAssigned { get; set; }
}
