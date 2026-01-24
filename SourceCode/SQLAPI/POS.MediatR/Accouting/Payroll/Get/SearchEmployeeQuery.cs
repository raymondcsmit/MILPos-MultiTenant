using MediatR;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class SearchEmployeeQuery : IRequest<List<IdNameDto>>
    {
        public string SearchQuery { get; set; }
        public string SearchBy { get; set; }
        public int PageSize { get; set; } = 10;
    }
}
