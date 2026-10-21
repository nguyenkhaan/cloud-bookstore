using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace backend.src.Models;

public class CustomerModel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    [MaxLength(12)]
    public string Phone { get; set; } = string.Empty;
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required]
    [RegularExpression(@"^\d{12}$")]
    public string NationalId { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public Guid TierId { get; set; }
    [ForeignKey(nameof(TierId))]
    public MembershipTierModel MembershipTier { get; set; } = null!;
    public int EligibleSpend { get; set; }
    public bool IsFlagged { get; set; }
    public string FlagReason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
