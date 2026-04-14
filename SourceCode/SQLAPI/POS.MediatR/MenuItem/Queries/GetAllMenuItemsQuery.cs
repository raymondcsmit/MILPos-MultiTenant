using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System.Collections.Generic;

namespace POS.MediatR.MenuItem.Queries
{
    public class GetAllMenuItemsQuery : IRequest<ServiceResponse<List<MenuItemDto>>>
    {
    }
}
