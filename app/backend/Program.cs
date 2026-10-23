//dotnet ef migrations add DatabaseSchemaPhase0
//dotnet ef database update
// Run: dotnet watch run 
using backend.src.Data;
using backend.src.Exceptions;
using backend.src.Scripts;
using backend.src.Services;
using backend.src.Bases.Enums;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;
var builder = WebApplication.CreateBuilder(args);
//System Configuration: Controller, Database, Exception...
builder.Services.AddControllers();
//CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "https://cloudbook.cloudian.io.vn",
                "http://localhost:5173"
            )
            .WithHeaders(
                "Content-Type",
                "Authorization",
                "Accept"
            )
            .WithMethods(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
            );
    });
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiHandlerException>();
builder.Services.AddOpenApi();

builder.Services.AddHttpClient<RedisService>();
builder.Services.AddTransient<TokenJtiStore>();
builder.Services
    .AddHealthChecks()
    .AddCheck<RedisReadinessHealthCheck>("redis", tags: ["ready"]);

string connectionString = builder.Configuration["ConnectionStrings:DefaultConnection"] 
    ?? throw new InvalidDataException("Cannot connect to database. Please check your connection string");
Console.WriteLine("Database connection configured.");
//Su dung lambda expression -> Luon return ve 1 KDL, ban chat cua lambda expression chinh la Func<U, V> 
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        connectionString
    )
);

//Authorization / Authentication
builder.Services
    .AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["ApiSettings:Issuer"],
            ValidAudience = builder.Configuration["ApiSettings:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    builder.Configuration["Jwt:AccessSecret:Key"]
                    ?? throw new InvalidOperationException("JWT key is missing")
                )
            ),
            RoleClaimType = "role"
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var jti = context.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                if (string.IsNullOrWhiteSpace(jti))
                {
                    context.Fail("Token JTI is missing.");
                    return;
                }

                var tokenStore = context.HttpContext.RequestServices.GetRequiredService<TokenJtiStore>();
                try
                {
                    if (!await tokenStore.IsActiveAsync(jti, TokenType.ACCESS, context.HttpContext.RequestAborted))
                    {
                        context.Fail("Token has been revoked.");
                    }
                }
                catch (Exception)
                {
                    context.Fail("Token state is unavailable.");
                }
            }
        };
    });
builder.Services.AddAuthorization();

//Dependency Injection
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<SettingService>();
builder.Services.AddScoped<AuthService>();

//Dependency Injection -> builder.Services.AddScoped<AuthService>();
var app = builder.Build();

app.UseExceptionHandler(new ExceptionHandlerOptions
{
    AllowStatusCode404Response = true
});


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/api/health/readiness", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();
