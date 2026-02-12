using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class SearchEmployeeQueryHandler : IRequestHandler<SearchEmployeeQuery, List<IdNameDto>>
    {
        private readonly IUserRepository     _userRepository;
        public SearchEmployeeQueryHandler(IUserRepository  userRepository)
        {
            _userRepository = userRepository;
        }
        public async Task<List<IdNameDto>> Handle(SearchEmployeeQuery request, CancellationToken cancellationToken)
        {
            var employees = _userRepository.All;
            if (!string.IsNullOrWhiteSpace(request.SearchQuery))
            {
                request.SearchQuery = request.SearchQuery.Trim().ToLower();
                employees = employees.Where(c => EF.Functions.Like(c.FirstName.ToLower(), $"{request.SearchQuery}%"));
            }
             var emp= await employees
                .OrderBy(c => c.FirstName)
                .Select(c => new IdNameDto
                {
                    Id = c.Id,
                    Name = c.FirstName + " " + c.LastName ,
                }).Take(request.PageSize)
                    .ToListAsync();
            return emp;
        }
    }
}
