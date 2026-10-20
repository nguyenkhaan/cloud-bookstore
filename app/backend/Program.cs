using backend.src.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
var builder = WebApplication.CreateBuilder(args);
//Khai bao cac service se su dung trong ung dung 
builder.Services.AddControllers();
string connectionString = builder.Configuration["ConnectionStrings:DefaultConnection"] 
    ?? throw new InvalidDataException("Cannot connect to database. Please check your connection string");
Console.WriteLine($"Connection string: {connectionString}");
//Su dung lambda expression -> Luon return ve 1 KDL, ban chat cua lambda expression chinh la Func<U, V> 
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        connectionString
    )
);
builder.Services.AddAuthentication("Bearer").AddJwtBearer("Bearer", options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["ApiSettings:Issuer"],
        ValidAudience = builder.Configuration["ApiSettings:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))

    };
});
//Dependency Injection -> builder.Services.AddScoped<AuthService>();
var app = builder.Build();

app.MapControllers();
app.MapGet("/api/health", () => "Hello World!");


app.Run();
