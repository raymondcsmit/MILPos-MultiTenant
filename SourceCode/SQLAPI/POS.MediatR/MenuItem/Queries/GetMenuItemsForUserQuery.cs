using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR.MenuItem.Queries
{
    public class GetMenuItemsForUserQuery : IRequest<ServiceResponse<List<MenuItemDto>>>
    {
        public Guid UserId { get; set; }
    }
}
