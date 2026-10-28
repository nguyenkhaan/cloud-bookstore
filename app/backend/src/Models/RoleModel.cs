using backend.src.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public class RoleModel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public RoleName RoleName { get; set; }
    public bool IsActive { get; set; } = true;
}
