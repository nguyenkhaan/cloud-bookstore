//dotnet ef migrations add DatabaseSchemaPhase0
//dotnet ef database update
// Run: dotnet watch run 
using backend.src.Data;
using System.Text.Json;
using Microsoft.Extensions.Options;
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
var authCookieSettings = builder.Configuration
    .GetSection(AuthCookieSettings.SectionName)
    .Get<AuthCookieSettings>() ?? new AuthCookieSettings();
var authSecuritySettings = AuthSecuritySettings.FromConfiguration(builder.Configuration);
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
            .WithOrigins(authCookieSettings.AllowedOrigins)
            .WithHeaders(
                "Content-Type",
                "Authorization",
                "Accept",
                authCookieSettings.CsrfHeaderName
            )
            .AllowCredentials()
            .WithMethods(
                "GET",
                "POST",
                "PUT",
                "PATCH",
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
builder.Services
    .AddOptions<AuthCookieSettings>()
    .BindConfiguration(AuthCookieSettings.SectionName)
    .ValidateDataAnnotations()
    .Validate(
        settings => settings.AllowedOrigins.All(origin =>
            Uri.TryCreate(origin, UriKind.Absolute, out var parsedOrigin) &&
            string.Equals(
                parsedOrigin.GetLeftPart(UriPartial.Authority),
                origin.TrimEnd('/'),
                StringComparison.OrdinalIgnoreCase)),
        "AuthCookies:AllowedOrigins must contain absolute origins without a path.")
    .ValidateOnStart();
builder.Services.AddSingleton(authCookieSettings);
builder.Services.AddSingleton(authSecuritySettings);

builder.Services.AddHttpClient<RedisService>();
builder.Services.AddTransient<TokenJtiStore>();
builder.Services.AddScoped<AuthCookieService>();
builder.Services.AddScoped<ICsrfTokenStore, RedisCsrfTokenStore>();
builder.Services.AddScoped<CsrfTokenService>();
builder.Services
    .AddHealthChecks()
    .AddCheck<RedisReadinessHealthCheck>("redis", tags: ["ready"])
    .AddCheck<MinioReadinessHealthCheck>("minio", tags: ["ready"]);

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
            OnMessageReceived = context =>
            {
                var selection = AuthTokenSelector.Select(
                    context.Request,
                    authCookieSettings.AccessCookieName);
                if (selection.AccessCookiePresent)
                {
                    context.HttpContext.Items[AuthTokenSelector.CookieAuthenticationItem] = true;
                    if (string.IsNullOrWhiteSpace(selection.Token))
                    {
                        context.Fail("Access cookie is invalid.");
                        return Task.CompletedTask;
                    }

                    context.Token = selection.Token;
                    return Task.CompletedTask;
                }

                if (!string.IsNullOrWhiteSpace(selection.Token))
                {
                    context.Token = selection.Token;
                }

                return Task.CompletedTask;
            },
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

builder.Services
    .AddOptions<MinioSettings>()
    .BindConfiguration(MinioSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddSingleton<IMinioService, MinioService>();
builder.Services.AddHostedService<MinioBucketInitializer>();

//Dependency Injection
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<SettingService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<EmployeeService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<AttachmentService>();
builder.Services.AddScoped<CategoryService>();
//Dependency Injection -> builder.Services.AddScoped<AuthService>();
var app = builder.Build();

app.UseExceptionHandler(new ExceptionHandlerOptions
{
    AllowStatusCode404Response = true
});

app.UseCors("AllowFrontend");
app.UseMiddleware<UnsafeOriginValidationMiddleware>();


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    var csrfHeaderName = app.Services
        .GetRequiredService<IOptions<AuthCookieSettings>>()
        .Value.CsrfHeaderName;

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint(
            "/openapi/v1.json",
            "Cloud Bookstore API v1"
        );

        options.RoutePrefix = "docs";


        options.UseRequestInterceptor(
    $$"""
    (request) => {
        const authorized =
            window.ui?.authSelectors?.authorized()?.toJS?.() ?? {};

        console.log("Swagger authorized:", authorized);

        const csrfToken = authorized["CsrfToken"]?.value;

        console.log("CSRF token found:", Boolean(csrfToken));

        if (csrfToken) {
            request.headers = request.headers || {};
            request.headers[{{JsonSerializer.Serialize(csrfHeaderName)}}] = csrfToken;
        }

        return request;
    }
    """
);



    });
}
if (args.Contains("--seed", StringComparer.OrdinalIgnoreCase))
{
    await Seed.RunAsync(app.Services, app.Environment.ContentRootPath);
    return;
}
app.UseAuthentication();
app.UseMiddleware<CsrfProtectionMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/api/health/readiness", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();
