//dotnet ef migrations add DatabaseSchemaPhase0
//dotnet ef database update
using backend.src.Data;
using backend.src.Scripts;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
var builder = WebApplication.CreateBuilder(args);
//System Configuration: Controller, Database, Exception...
builder.Services.AddControllers();
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
    });
builder.Services.AddAuthorization();

//Dependency Injection
builder.Services.AddScoped<TokenService>();


//Dependency Injection -> builder.Services.AddScoped<AuthService>();
var app = builder.Build();

if (args.Contains("--seed", StringComparer.OrdinalIgnoreCase))
{
    await Seed.RunAsync(app.Services, app.Environment.ContentRootPath);
    return;
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
