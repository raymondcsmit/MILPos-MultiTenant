using Microsoft.Extensions.Configuration;
using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace POS.Domain.Sync
{
    /// <summary>
    /// Client for communicating with Cloud API using standard REST endpoints
    /// </summary>
    public class CloudApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly Guid _tenantId;

        public CloudApiClient(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            
            var cloudApiUrl = configuration["SyncSettings:CloudApiUrl"];
            if (!string.IsNullOrEmpty(cloudApiUrl))
            {
                _httpClient.BaseAddress = new Uri(cloudApiUrl);
            }

            // Get TenantId from configuration
            var tenantIdStr = configuration["TenantId"];
            if (Guid.TryParse(tenantIdStr, out var parsedTenantId))
            {
                _tenantId = parsedTenantId;
                // Add TenantId to all requests
                _httpClient.DefaultRequestHeaders.Add("X-Tenant-ID", _tenantId.ToString());
            }
        }

        /// <summary>
        /// Get entities with optional modifiedSince filter
        /// </summary>
        public async Task<List<T>> GetEntitiesAsync<T>(string entityType, DateTime? modifiedSince = null)
        {
            var url = $"/api/{entityType.ToLower()}s";
            if (modifiedSince.HasValue)
            {
                url += $"?modifiedSince={modifiedSince:O}";
            }

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<List<T>>();
        }

        /// <summary>
        /// Create entity
        /// </summary>
        public async Task<T> CreateEntityAsync<T>(string entityType, T entity)
        {
            var url = $"/api/{entityType.ToLower()}s";
            var response = await _httpClient.PostAsJsonAsync(url, entity);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<T>();
        }

        /// <summary>
        /// Update entity
        /// </summary>
        public async Task<UpdateResult<T>> UpdateEntityAsync<T>(string entityType, Guid id, T entity)
        {
            var url = $"/api/{entityType.ToLower()}s/{id}";
            var response = await _httpClient.PutAsJsonAsync(url, entity);

            if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
            {
                // Version conflict
                var conflictData = await response.Content.ReadFromJsonAsync<ConflictResponse<T>>();
                return new UpdateResult<T>
                {
                    IsConflict = true,
                    ServerData = conflictData.ServerData,
                    ServerVersion = conflictData.ServerVersion
                };
            }

            response.EnsureSuccessStatusCode();
            return new UpdateResult<T> { IsConflict = false };
        }

        /// <summary>
        /// Delete entity
        /// </summary>
        public async Task DeleteEntityAsync(string entityType, Guid id)
        {
            var url = $"/api/{entityType.ToLower()}s/{id}";
            var response = await _httpClient.DeleteAsync(url);
            response.EnsureSuccessStatusCode();
        }
    }

    public class UpdateResult<T>
    {
        public bool IsConflict { get; set; }
        public T ServerData { get; set; }
        public long ServerVersion { get; set; }
    }

    public class ConflictResponse<T>
    {
        public string Message { get; set; }
        public long ServerVersion { get; set; }
        public T ServerData { get; set; }
    }
}
