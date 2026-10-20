using static System.Runtime.InteropServices.JavaScript.JSType;
using System.ComponentModel.DataAnnotations;
namespace backend.src.Models;

public class EmployeeModel
{
    //uuid 
    public Guid Id { get; set; } = Guid.NewGuid(); //Tu dong tao Guid
    //Day la property, khong phai field -> Su dung full Pascal Case cho t
    [Required]
    public string Name { get; set; } = string.Empty;
    [Required]
    [EmailAddress]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
