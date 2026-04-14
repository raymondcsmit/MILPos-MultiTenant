using Microsoft.AspNetCore.Mvc;
using POS.API.Filters;

namespace POS.API.Controllers
{
    [StoreTenant]
    public abstract class StoreBaseController : Controller
    {
    }
}
