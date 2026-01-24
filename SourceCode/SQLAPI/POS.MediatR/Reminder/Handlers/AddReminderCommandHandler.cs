using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;

namespace POS.MediatR.Handlers
{
    public class AddReminderCommandHandler
        : IRequestHandler<AddReminderCommand, ServiceResponse<ReminderDto>>
    {

        private readonly IReminderRepository _reminderRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly UserInfoToken _userInfoToken;

        public AddReminderCommandHandler(IReminderRepository reminderRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            UserInfoToken userInfoToken)
        {
            _reminderRepository = reminderRepository;
            _mapper = mapper;
            _uow = uow;
            _userInfoToken = userInfoToken;
        }

        public async Task<ServiceResponse<ReminderDto>> Handle(AddReminderCommand request, CancellationToken cancellationToken)
        {
            if (!request.Frequency.HasValue)
            {
                request.Frequency = Frequency.OneTime;
            }

            if (!request.ReminderUsers.Any(c => c.UserId == _userInfoToken.Id))
            {
                request.ReminderUsers.Add(new ReminderUserDto
                {
                    UserId = _userInfoToken.Id
                });
            }
            var reminder = _mapper.Map<Reminder>(request);
            _reminderRepository.Add(reminder);
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<ReminderDto>.Return500();
            }

            return ServiceResponse<ReminderDto>.ReturnResultWith201(_mapper.Map<ReminderDto>(reminder));
        }
    }
}
