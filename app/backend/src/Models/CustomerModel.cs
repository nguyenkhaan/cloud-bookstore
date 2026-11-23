using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace backend.src.Models;

public class CustomerModel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    [MaxLength(15)]
    public string Phone { get; set; } = string.Empty;
    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;
    [MaxLength(255)]
    [EmailAddress]
    public string? Email { get; set; }
    [MaxLength(20)]
    public string? NationalId { get; set; }
    public string? Address { get; set; }
    public Guid TierId { get; set; }
    [ForeignKey(nameof(TierId))]
    public MembershipTierModel MembershipTier { get; set; } = null!;
    public long EligibleSpend { get; set; }
    public bool IsFlagged { get; set; }
    public string? FlagReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
