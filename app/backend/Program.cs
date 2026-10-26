//dotnet ef migrations add DatabaseSchemaPhase0
//dotnet ef database update
// Run: dotnet watch run 
using backend.src.Data;
using backend.src.Exceptions;
using backend.src.Configurations;
using backend.src.Infrastructure;
using backend.src.Models.Enums;
using backend.src.Scripts;
using backend.src.Services;
using backend.src.Bases.Enums;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;
using System.Text.Json.Serialization;
var builder = WebApplication.CreateBuilder(args);
//System Configuration: Controller, Database, Exception...
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    { //Cau hinh de cho phep nhan enum la chuoi khi gui request. 
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(
            namingPolicy: null,
            allowIntegerValues: false
        ));
    });
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
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddOperationTransformer<BearerSecurityOperation>();
});

builder.Services
    .AddOptions<AuthSecuritySettings>()
    .BindConfiguration(AuthSecuritySettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

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
            ClockSkew = TimeSpan.Zero,

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
                        return;
                    }

                    var subject = context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                    if (!Guid.TryParse(subject, out var employeeId))
                    {
                        context.Fail("Token subject is invalid.");
                        return;
                    }
                    //Getting role name 
                    var jwtRoleValue = context.Principal?
                        .FindFirst("role")?
                        .Value;
                    var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                    //Lay them va so sanh voi role name ben trong database nua de co the nam duoc ro hon
                    var employee = await dbContext.Employees
                        .AsNoTracking()
                        .Include(employee => employee.Role)
                        .SingleOrDefaultAsync(item => item.Id == employeeId, context.HttpContext.RequestAborted);
                    if (employee is null ||
                        employee.Status != backend.src.Models.Enums.EmployeeStatus.ACTIVE ||
                        employee.LockoutEndUtc > DateTime.UtcNow)
                    {
                        context.Fail("Account is unavailable.");
                        return;
                    }
                    if (!Enum.TryParse<RoleName>(
                        jwtRoleValue,
                        ignoreCase: true,
                        out var jwtRole))
                    {
                        context.Fail("Token role is invalid.");
                        return;
                    }
                    if (employee.Role.RoleName != jwtRole)
                    {
                        context.Fail("Account role has been changed");
                        return;
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

builder.Services
    .AddOptions<EmailSettings>()
    .BindConfiguration("Email")
    .ValidateDataAnnotations()
    .Validate(
        settings => Uri.TryCreate(settings.FrontendBaseUrl, UriKind.Absolute, out _),
        "Email:FrontendBaseUrl must be an absolute URL.")
    .ValidateOnStart();

//Dependency Injection
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<SettingService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<AuditLogService>();
//Dependency Injection -> builder.Services.AddScoped<AuthService>();
var app = builder.Build();

app.UseExceptionHandler(new ExceptionHandlerOptions
{
    AllowStatusCode404Response = true
});

app.UseCors("AllowFrontend");


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
