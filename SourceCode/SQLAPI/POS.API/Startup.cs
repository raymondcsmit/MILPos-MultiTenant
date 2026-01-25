using System;
using System.IO;
using System.Linq;
using System.Reflection;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi;
using Newtonsoft.Json;
using POS.API.Helpers;
using POS.API.Helpers.Mapping;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Domain.Sync;
using POS.Domain.ImportExport;
using POS.Helper;
using POS.MediatR.PipeLineBehavior;
using POS.Repository;
using Microsoft.OpenApi.Models;

namespace POS.API
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            var connectionstring = Configuration.GetConnectionString("DbConnectionString");
            var assembly = AppDomain.CurrentDomain.Load("POS.MediatR");
            var defaultUserId = Configuration.GetSection("DefaultUser").GetSection("DefaultUserId").Value;
            //services.AddMediatR(assembly);

            services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(assembly));

            services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            services.AddValidatorsFromAssemblies(Enumerable.Repeat(assembly, 1));

            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            
            // Configure deployment settings
            services.Configure<DeploymentSettings>(Configuration);
            var deploymentSettings = Configuration.Get<DeploymentSettings>();
            
            // Register tenant provider based on deployment mode
            if (deploymentSettings?.MultiTenancy?.Enabled == true)
            {
                // Cloud mode: Full multi-tenant support
                services.AddScoped<ITenantProvider, TenantProvider>();
            }
            else
            {
                // Desktop mode: Single-tenant support
                services.AddScoped<ITenantProvider, SingleTenantProvider>();
            }
            
            // Register sync services
            services.AddSingleton<IDeviceIdentifier, DeviceIdentifier>();
            services.AddScoped<ChangeTrackingService>();
            services.AddScoped<ConflictResolutionService>();
            services.AddHttpClient<CloudApiClient>();
            services.AddScoped<SyncEngine>();
            
            // Register scheduled sync service (Desktop only)
            if (deploymentSettings?.DeploymentMode == "Desktop")
            {
                services.AddHostedService<POS.API.Services.ScheduledSyncService>();
            }
            // Register FBR Sync Background Service
            services.AddHostedService<POS.API.BackgroundServices.FBRSyncBackgroundService>();
            
            JwtSettings settings;
            settings = GetJwtSettings();
            services.AddSingleton(settings);

            services.AddSingleton(new PathHelper(Configuration));
            services.AddSingleton<IConnectionMappingRepository, ConnectionMappingRepository>();
            services.AddScoped(c => new UserInfoToken() { Id = Guid.Parse(defaultUserId) });
            
            // Configure DbContext - Scoped lifetime
            services.AddDbContext<POSDbContext>((serviceProvider, options) =>
            {
                var provider = Configuration.GetValue<string>("DatabaseProvider") ?? "Sqlite";
                if (provider == "Sqlite")
                {
                    options.UseSqlite(Configuration.GetConnectionString("SqliteConnectionString"))
                    .EnableSensitiveDataLogging();
                }
                else
                {
                    options.UseSqlServer(Configuration.GetConnectionString("DbConnectionString"))
                    .EnableSensitiveDataLogging();
                }

                options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
                options.ConfigureWarnings(builder =>
                {
                    builder.Ignore(CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning);
                    if (provider == "Sqlite")
                    {
                        builder.Ignore(RelationalEventId.PendingModelChangesWarning);
                    }
                });
            });
            
            services.AddIdentity<User, Role>()
             .AddEntityFrameworkStores<POSDbContext>()
             .AddDefaultTokenProviders();

            services.Configure<IdentityOptions>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequiredLength = 5;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
            });
            services.AddSingleton(MapperConfig.GetMapperConfigs());
            services.AddScoped<SeedingService>();
            services.AddScoped<TenantDataMigrationService>();
            
            // Import/Export Services
            services.AddScoped<IImportExportService<POS.Data.Product>, ProductImportExportService>();
            services.AddScoped<IImportExportService<POS.Data.Customer>, CustomerImportExportService>();
            services.AddScoped<IImportExportService<POS.Data.Supplier>, SupplierImportExportService>();
            
            // FBR Integration Services
            services.AddScoped<POS.Domain.FBR.IFBRAuthenticationService, POS.Domain.FBR.FBRAuthenticationService>();
            services.AddScoped<POS.Domain.FBR.IFBRQRCodeService, POS.Domain.FBR.FBRQRCodeService>();
            services.AddHttpClient<POS.Domain.FBR.IFBRInvoiceService, POS.Domain.FBR.FBRInvoiceService>()
                .SetHandlerLifetime(TimeSpan.FromMinutes(5)); // Prevent socket exhaustion
            
            services.AddDependencyInjection();
            services.AddJwtAutheticationConfiguration(settings);
            
            // Configure CORS based on deployment mode
            services.AddCors(options =>
            {
                if (deploymentSettings?.IsCloud == true)
                {
                    // Cloud mode: Restrict to specific origins
                    var allowedOrigins = deploymentSettings.CloudSettings?.CorsOrigins?.ToArray() 
                        ?? new[] { "https://app.yourcompany.com" };
                    
                    options.AddPolicy("CloudCorsPolicy", builder =>
                    {
                        builder.WithOrigins(allowedOrigins)
                               .AllowAnyHeader()
                               .AllowAnyMethod()
                               .AllowCredentials()
                               .WithExposedHeaders("X-Pagination", "X-Tenant-ID");
                    });
                }
                else
                {
                    // Desktop mode: Allow all origins (embedded app)
                    options.AddPolicy("DesktopCorsPolicy", builder =>
                    {
                        builder.SetIsOriginAllowed(origin => true)
                               .AllowAnyHeader()
                               .AllowAnyMethod()
                               .AllowCredentials()
                               .WithExposedHeaders("X-Pagination");
                    });
                }
                
                // Keep legacy policy for backward compatibility
                options.AddPolicy("ExposeResponseHeaders",
                    builder =>
                    {
                        builder.SetIsOriginAllowed(origin => true)
                               .WithExposedHeaders("X-Pagination")
                               .AllowAnyHeader()
                               .WithMethods("POST", "PUT", "PATCH", "GET", "DELETE")
                               .AllowCredentials();
                    });
            });

            services.AddSignalR().AddHubOptions<UserHub>(options =>
            {
                options.EnableDetailedErrors = true;
            });
            services.Configure<IISServerOptions>(options =>
            {
                options.AutomaticAuthentication = false;
            });
            services.AddResponseCompression(options =>
            {
                options.Providers.Add<GzipCompressionProvider>();
            });
            services.AddControllers()
                .AddNewtonsoftJson(options =>
                {
                    options.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
                    options.SerializerSettings.DateTimeZoneHandling = DateTimeZoneHandling.Utc;
                });
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Version = "v1",
                    Title = "POS API"
                });

                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. \r\n\r\n Enter 'Bearer' [space] and then your token in the text input below.\r\n\r\nExample: \"Bearer 12345abcdef\"",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement {
                   {
                     new OpenApiSecurityScheme
                     {
                       Reference = new OpenApiReference
                       {
                         Type = ReferenceType.SecurityScheme,
                         Id = "Bearer"
                       }
                      },
                      new string[] { }
                    }
                  });

                //Set the comments path for the Swagger JSON and UI.
                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                c.IncludeXmlComments(xmlPath);
            });

            //var jobService = sp.GetService<JobService>();
            //jobService.StartScheduler();
            SpaStartup.ConfigureServices(services);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, ILoggerFactory loggerFactory)
        {
            // if (env.IsDevelopment())
            // {
                app.UseDeveloperExceptionPage();
            // }
            // else
            // {
            //     app.UseExceptionHandler(appBuilder =>
            //     {
            //         appBuilder.Run(async context =>
            //         {
            //             var exceptionHandlerFeature = context.Features.Get<IExceptionHandlerFeature>();
            //             if (exceptionHandlerFeature != null)
            //             {
            //                 var logger = loggerFactory.CreateLogger("Global exception logger");
            //                 logger.LogError(500,
            //                     exceptionHandlerFeature.Error,
            //                     exceptionHandlerFeature.Error.Message);
            //             }
            //             context.Response.StatusCode = 500;
            //             await context.Response.WriteAsync("An unexpected fault happened. Try again later.");
            //         });
            //     });
            // }
            app.UseSwagger(c =>
            {
                c.SerializeAsV2 = true;
            });
            app.UseSwaggerUI(c =>
            {
                c.DefaultModelsExpandDepth(-1);
                c.SwaggerEndpoint($"v1/swagger.json", "POS API");
                c.RoutePrefix = "swagger";
            });
            app.UseStaticFiles();

            // Get deployment settings
            var deploymentSettings = app.ApplicationServices.GetService<Microsoft.Extensions.Options.IOptions<DeploymentSettings>>()?.Value;
            
            // Apply CORS based on deployment mode
            if (deploymentSettings?.IsCloud == true)
            {
                app.UseCors("CloudCorsPolicy");
            }
            else
            {
                app.UseCors("DesktopCorsPolicy");
            }
            
            app.UseHttpsRedirection();
            
            // Add tenant resolution middleware only in cloud mode
            if (deploymentSettings?.MultiTenancy?.Enabled == true)
            {
                app.UseMiddleware<POS.API.Middleware.TenantResolutionMiddleware>();
            }
            
            app.UseAuthentication();
            app.UseRouting();
            app.UseAuthorization();
            app.UseResponseCompression();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHub<UserHub>("/userHub");
            });
            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            });
            SpaStartup.Configure(app);
        }

        public JwtSettings GetJwtSettings()
        {
            JwtSettings settings = new JwtSettings();

            settings.Key = Configuration["JwtSettings:key"];
            settings.Audience = Configuration["JwtSettings:audience"];
            settings.Issuer = Configuration["JwtSettings:issuer"];
            settings.MinutesToExpiration =
             Convert.ToInt32(
                Configuration["JwtSettings:minutesToExpiration"]);

            return settings;
        }
    }
}
