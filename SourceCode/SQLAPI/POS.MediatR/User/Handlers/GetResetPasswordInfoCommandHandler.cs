using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Helper;
using POS.Repository;

namespace POS.MediatR
{
    public class GetResetPasswordInfoCommandHandler(
        IUserRepository userRepository,
        IMapper mapper)
        : IRequestHandler<GetResetPasswordInfoCommand, ServiceResponse<UserDto>>
    {
        public async Task<ServiceResponse<UserDto>> Handle(GetResetPasswordInfoCommand request, CancellationToken cancellationToken)
        {
            var user = await userRepository.All.Where(c => c.ResetPasswordCode == request.Token).FirstOrDefaultAsync();
            if (user == null)
            {
                return ServiceResponse<UserDto>.ReturnFailed(404, "User not found");
            }

            return ServiceResponse<UserDto>.ReturnResultWith200(mapper.Map<UserDto>(user));
        }
    }
}
