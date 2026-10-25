using backend.src.Data;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using backend.Tests.Fakes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace backend.Tests.Security;

/// Chạy cả pipeline thật (JwtBearer, policy, exception handler) nhưng thay Postgres bằng SQLite
/// và Redis bằng FakeSessionStore, nên không cần hạ tầng bên ngoài.
public class ApiFactory : WebApplicationFactory<Program>
{
    public const string Password = "TestPassword123!";
    public const string AccessSecret = "test-access-secret-key-32-characters-long";
    public const string Issuer = "test-issuer";
    public const string Audience = "test-audience";

    public const string AdminEmail = "admin@test.io";
    public const string CashierEmail = "cashier@test.io";
    public const string InventoryEmail = "inventory@test.io";
    public const string LockedEmail = "locked@test.io";

    public FakeSessionStore Store { get; } = new();
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public ApiFactory()
    {
        // Program.cs đọc cấu hình ngay lúc khởi động, nên đặt bằng biến môi trường là cách chắc chắn nhất.
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", "Host=unused");
        Environment.SetEnvironmentVariable("ConnectionStrings__Redis", "localhost:6379,abortConnect=false");
        Environment.SetEnvironmentVariable("ApiSettings__Issuer", Issuer);
        Environment.SetEnvironmentVariable("ApiSettings__Audience", Audience);
        Environment.SetEnvironmentVariable("Jwt__AccessSecret__Key", AccessSecret);
        Environment.SetEnvironmentVariable("Jwt__RefreshSecret__Key", "test-refresh-secret-key-32-characters-long");
        Environment.SetEnvironmentVariable("Jwt__VerifyRegisterSecret__Key", "test-verify-register-secret-key-32-characters");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Gỡ cấu hình Npgsql (kể cả IDbContextOptionsConfiguration của EF Core 9+) để không bị trùng provider.
            var efDescriptors = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                || d.ServiceType == typeof(DbContextOptions)
                || d.ServiceType.FullName?.Contains("IDbContextOptionsConfiguration") == true).ToList();
            foreach (var descriptor in efDescriptors) services.Remove(descriptor);

            _connection.Open();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

            services.RemoveAll<ISessionStore>();
            services.RemoveAll<ILoginThrottle>();
            services.AddSingleton<ISessionStore>(Store);
            services.AddSingleton<ILoginThrottle>(Store);
        });
    }

    public void SeedUsers()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
        if (db.Employees.Any()) return;

        var roles = Enum.GetValues<RoleName>()
            .ToDictionary(name => name, name => new RoleModel { RoleName = name, IsActive = true });
        db.Roles.AddRange(roles.Values);

        var hash = BCrypt.Net.BCrypt.HashPassword(Password, workFactor: 4);
        EmployeeModel Make(string email, RoleName role, EmployeeStatus status = EmployeeStatus.ACTIVE) => new()
        {
            Email = email, FullName = email, Password = hash, Phone = "0123456789", Role = roles[role], Status = status
        };
        db.Employees.AddRange(
            Make(AdminEmail, RoleName.ADMIN),
            Make(CashierEmail, RoleName.CASHIER),
            Make(InventoryEmail, RoleName.INVENTORY_MANAGER),
            Make(LockedEmail, RoleName.CASHIER, EmployeeStatus.LOCKED));
        db.SaveChanges();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}