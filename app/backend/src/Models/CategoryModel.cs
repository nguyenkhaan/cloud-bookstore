using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public class CategoryModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ParentId { get; set; }
    [MaxLength(100)] public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
