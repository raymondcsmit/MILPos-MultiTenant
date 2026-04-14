using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using POS.Common.DapperInfrastructure;
using POS.Data.Dto;
using POS.Domain;
using POS.MediatR.Dashboard.Commands;
using POS.MediatR.Dashboard.Handlers;
using POS.Repository;
using Xunit;
using Dapper;

namespace POS.API.Tests.Handlers.Dashboard
{
    public class GetIncomeComparisonQueryHandlerTests : IDisposable
    {
        private readonly SqliteConnection _connection;

        public GetIncomeComparisonQueryHandlerTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            // Initialize Schema
            _connection.Execute(@"
                CREATE TABLE SalesOrders (
                    TenantId TEXT,
                    IsDeleted INTEGER,
                    IsSalesOrderRequest INTEGER,
                    SOCreatedDate TEXT,
                    TotalAmount REAL,
                    LocationId TEXT
                );
                
                CREATE TABLE PurchaseOrders (
                    TenantId TEXT,
                    IsDeleted INTEGER,
                    IsPurchaseOrderRequest INTEGER,
                    POCreatedDate TEXT,
                    TotalAmount REAL,
                    LocationId TEXT
                );
            ");
        }

        public void Dispose()
        {
            _connection.Close();
            _connection.Dispose();
        }

        [Fact]
        public async Task Handle_WithDapper_ReturnsCorrectIncomeComparison()
        {
            // Arrange
            var tenantId = Guid.NewGuid();
            var locationId = Guid.NewGuid();
            
            // Insert Seed Data using Dapper to ensure type mapping matches
            var currentYear = DateTime.Now.Year;
            var lastYear = currentYear - 1;

            _connection.Execute(@"
                INSERT INTO SalesOrders (TenantId, IsDeleted, IsSalesOrderRequest, SOCreatedDate, TotalAmount, LocationId)
                VALUES 
                (@TenantId, 0, 0, @Date1, 100.50, @LocationId),
                (@TenantId, 0, 0, @Date2, 200.00, @LocationId),
                (@TenantId, 0, 0, @Date3, 50.00, @LocationId);

                INSERT INTO PurchaseOrders (TenantId, IsDeleted, IsPurchaseOrderRequest, POCreatedDate, TotalAmount, LocationId)
                VALUES 
                (@TenantId, 0, 0, @Date1, 20.00, @LocationId),
                (@TenantId, 0, 0, @Date3, 10.00, @LocationId);
            ", new {
                TenantId = tenantId,
                LocationId = locationId,
                Date1 = new DateTime(currentYear, 1, 15),
                Date2 = new DateTime(currentYear, 2, 15),
                Date3 = new DateTime(lastYear, 1, 15)
            });

            var loggerMock = new Mock<ILogger<GetIncomeComparisonQueryHandler>>();
            var tenantProviderMock = new Mock<ITenantProvider>();
            tenantProviderMock.Setup(t => t.GetTenantId()).Returns(tenantId);

            var configMock = new Mock<IConfiguration>();
            var configSectionMock = new Mock<IConfigurationSection>();
            configSectionMock.Setup(x => x.Value).Returns("true");
            configMock.Setup(c => c.GetSection("Features:Dapper:GetIncomeComparisonQueryHandler")).Returns(configSectionMock.Object);

            var sqlAccessorMock = new Mock<ISqlConnectionAccessor>();
            sqlAccessorMock.Setup(x => x.GetOpenConnection()).Returns(_connection);
            sqlAccessorMock.Setup(x => x.GetCurrentTransaction()).Returns((System.Data.IDbTransaction)null);

            var salesOrderRepoMock = new Mock<ISalesOrderRepository>();
            var purchaseOrderRepoMock = new Mock<IPurchaseOrderRepository>();
            
            var userInfoToken = new UserInfoToken { LocationIds = new List<Guid> { locationId } };

            var handler = new GetIncomeComparisonQueryHandler(
                loggerMock.Object,
                tenantProviderMock.Object,
                configMock.Object,
                sqlAccessorMock.Object,
                salesOrderRepoMock.Object,
                purchaseOrderRepoMock.Object,
                userInfoToken);

            var query = new GetIncomeComparisonQuery { LocationId = locationId };

            // Act
            var result = await handler.Handle(query, CancellationToken.None);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(12, result.Count);

            var currentJan = result.First(r => r.Month == 1);
            Assert.Equal(80.50m, currentJan.CurrentYearIncome);
            Assert.Equal(40.00m, currentJan.LastYearIncome);
            
            var currentFeb = result.First(r => r.Month == 2);
            Assert.Equal(200.00m, currentFeb.CurrentYearIncome);
        }
    }
}