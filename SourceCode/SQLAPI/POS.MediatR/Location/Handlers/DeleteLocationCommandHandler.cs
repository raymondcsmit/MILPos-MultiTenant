using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Location.Commands;
using POS.Repository;

namespace POS.MediatR.Location.Handlers
{
    public class DeleteLocationCommandHandler(
            IUnitOfWork<POSDbContext> uow,
            IPurchaseOrderRepository purchaseOrderRepository,
            ISalesOrderRepository salesOrderRepository,
            ILogger<DeleteLocationCommandHandler> logger,
            IStockTransferRepository stockTransferRepository,
            ILocationRepository locationRepository,
            IUserRepository userRepository,
            IUserLocationsRepository _userLocationsRepository,
            IConnectionMappingRepository connectionMappingRepository,
            IHubContext<UserHub, IHubClient> _hubContext,
            ILogger<DeleteLocationCommandHandler> _logger,
            UserInfoToken userInfoToken) : IRequestHandler<DeleteLocationCommand, ServiceResponse<bool>>
    {

        public async Task<ServiceResponse<bool>> Handle(DeleteLocationCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await locationRepository.FindAsync(request.Id);
            if (entityExist == null)
            {
                return ServiceResponse<bool>.Return404();
            }

            var totalLocations = await locationRepository.All.CountAsync(cancellationToken);
            if (totalLocations <= 1)
            {
                logger.LogError("Cannot delete the last remaining location record.");
                return ServiceResponse<bool>.Return409("Cannot delete the last remaining location.");
            }

            var exitingPurchaseOrder = purchaseOrderRepository
              .AllIncluding(c => c.PurchaseOrderItems)
              .Where(c => c.LocationId == request.Id).Any();

            if (exitingPurchaseOrder)
            {
                logger.LogError("Location can not be Deleted because it is use in Purchase Order");
                return ServiceResponse<bool>.Return409("Location can not be Deleted because it is use in Purchase Order");
            }

            var exitingSalesOrder = salesOrderRepository
               .AllIncluding(c => c.SalesOrderItems)
               .Where(c => c.LocationId == request.Id).Any();

            if (exitingSalesOrder)
            {
                logger.LogError("Location can not be Deleted because it is use in Sales Order");
                return ServiceResponse<bool>.Return409("Location can not be Deleted because it is use in Sales Order");
            }

            var stockTransferItem = stockTransferRepository.All
               .Where(c => c.FromLocationId == request.Id || c.ToLocationId == request.Id).Any();

            if (stockTransferItem)
            {
                logger.LogError("Location can not be Deleted because it is use in Sales Order");
                return ServiceResponse<bool>.Return409("Location can not be Deleted because it is use in Stock Transfer");
            }

            var isAssignedToUser = await _userLocationsRepository.All
            .AnyAsync(c => c.LocationId == request.Id, cancellationToken);

            if (isAssignedToUser)
            {
                logger.LogError("Location cannot be deleted because it is assigned to a user.");
                return ServiceResponse<bool>.Return409("Location cannot be deleted because it is assigned to a user.");
            }

            locationRepository.Delete(request.Id);
            if (await uow.SaveAsync() <= 0)
            {
                return ServiceResponse<bool>.Return500();
            }
            // send notification permission change
            try
            {
                var usersLocationIds = await _userLocationsRepository
               .AllIncluding(d => d.User)
               .Where(c => c.LocationId == request.Id || c.User.IsAllLocations)
               .Select(c => c.UserId)
               .ToListAsync();

                var allUsers = connectionMappingRepository.GetAllUsers().ToList();

                var finalUserIds = allUsers.Where(c => usersLocationIds.Contains(c.Id)).Select(c => c.Id).ToList();

                var userIds = await userRepository.All.Where(c => finalUserIds.Contains(c.Id))
                    .Select(cs => cs.Id).ToListAsync(cancellationToken);
                if (userInfoToken != null)
                {
                    userIds.Add(userInfoToken.Id);
                }

                foreach (var userId in userIds.Distinct())
                {
                    var onlineUser = allUsers.FirstOrDefault(u => u.Id == userId);
                    if (onlineUser != null)
                    {
                        await _hubContext.Clients.Client(onlineUser.ConnectionId)
                            .OnUserPermissionChange(userId);
                    }
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error sending permission change notification to online users.");
            }

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
