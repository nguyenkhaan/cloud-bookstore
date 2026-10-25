//dotnet ef migrations add DatabaseSchemaPhase0
//dotnet ef database update
// Run: dotnet watch run
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.src.Data;
using backend.src.Exceptions;
using backend.src.Scripts;
using backend.src.Services;
using backend.src.Bases;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "https://cloudbook.cloudian.io.vn",
                "http://localhost:5173"
            )
            .WithHeaders("Content-Type", "Authorization", "Accept")
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .AllowCredentials();
    });
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiHandlerException>();
builder.Services.AddOpenApi();

string connectionString = builder.Configuration["ConnectionStrings:DefaultConnection"]
    ?? throw new InvalidDataException("Cannot connect to database. Please check your connection string");
Console.WriteLine("Database connection configured.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

// Redis: lưu jti của phiên + đếm đăng nhập sai
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(
        builder.Configuration.GetConnectionString("Redis")
        ?? throw new InvalidOperationException("Redis connection string is missing")));
builder.Services.AddSingleton<RedisSessionStore>();
builder.Services.AddSingleton<ISessionStore>(sp => sp.GetRequiredService<RedisSessionStore>());
builder.Services.AddSingleton<ILoginThrottle>(sp => sp.GetRequiredService<RedisSessionStore>());

// Authentication / Authorization
builder.Services
    .AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.MapInboundClaims = false; // giữ nguyên tên claim: sub, jti, role
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["ApiSettings:Issuer"]
                ?? throw new InvalidOperationException("ApiSettings:Issuer is missing"),
            ValidAudience = builder.Configuration["ApiSettings:Audience"]
                ?? throw new InvalidOperationException("ApiSettings:Audience is missing"),
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    builder.Configuration["Jwt:AccessSecret:Key"]
                    ?? throw new InvalidOperationException("JWT key is missing"))),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ClockSkew = TimeSpan.FromSeconds(10),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
        options.Events = new JwtBearerEvents
        {
            // Token đúng chữ ký vẫn bị từ chối nếu jti không còn trong Redis (đã logout/khóa/hết hạn)
            OnTokenValidated = async ctx =>
            {
                try
                {
                    var jti = ctx.Principal?.FindFirstValue(JwtRegisteredClaimNames.Jti);
                    var store = ctx.HttpContext.RequestServices.GetRequiredService<ISessionStore>();
                    if (jti is null || !await store.IsAccessActiveAsync(jti))
                        ctx.Fail("Session revoked or expired");
                }
                catch (Exception ex)
                {
                    // Redis lỗi => fail closed
                    ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>()
                        .LogError(ex, "Cannot verify session in Redis");
                    ctx.Fail("Session store unavailable");
                }
            }
        };
    });

// Mặc định mọi endpoint yêu cầu đăng nhập; endpoint công khai phải ghi [AllowAnonymous]
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
    .AddPolicy(AppPolicies.AdminOnly, p => p.RequireRole(AppRoles.Admin))
    .AddPolicy(AppPolicies.CounterAccess, p => p.RequireRole(AppRoles.Admin, AppRoles.Cashier))
    .AddPolicy(AppPolicies.InventoryAccess, p => p.RequireRole(AppRoles.Admin, AppRoles.InventoryManager));
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, JsonAuthorizationResultHandler>();

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<SettingService>();
builder.Services.AddScoped<AuthService>();

var app = builder.Build();

app.UseExceptionHandler(new ExceptionHandlerOptions
{
    AllowStatusCode404Response = true
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Cloud Bookstore API v1");
        options.RoutePrefix = "docs";
    });
}
if (args.Contains("--seed", StringComparer.OrdinalIgnoreCase))
{
    await Seed.RunAsync(app.Services, app.Environment.ContentRootPath);
    return;
}

app.UseCors("AllowFrontend"); // phải đứng trước UseAuthentication
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }