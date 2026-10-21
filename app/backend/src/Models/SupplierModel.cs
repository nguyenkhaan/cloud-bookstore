using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public class SupplierModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(20)] public string? Phone { get; set; }
    public string? Address { get; set; }
    [MaxLength(20)] public string? TaxCode { get; set; }
    public bool IsActive { get; set; } = true;
}
