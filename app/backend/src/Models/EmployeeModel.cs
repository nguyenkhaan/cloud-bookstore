using static System.Runtime.InteropServices.JavaScript.JSType;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using backend.src.Models.Enums;
namespace backend.src.Models;

public class EmployeeModel
{
    //uuid 
    public Guid Id { get; set; } = Guid.NewGuid(); //Tu dong tao Guid
    //Day la property, khong phai field -> Su dung full Pascal Case cho t
    [Required]
    [MaxLength(200)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
    [Required]
    [MaxLength(12)]
    public string Phone { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; } = null;
    public Guid RoleId { get; set; }
    [ForeignKey(nameof(RoleId))]
    public RoleModel Role { get; set; } = null!;
    public EmployeeStatus Status { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEndUtc { get; set; }
    [MaxLength(128)]
    public string? PasswordResetTokenHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
