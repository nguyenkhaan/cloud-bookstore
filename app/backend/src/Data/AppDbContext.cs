using backend.src.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    { }
    //Sau khi viet xong model thi cap nhat DbSet 
    public DbSet<EmployeeModel> Employee => Set<EmployeeModel>();
}
