using System.ComponentModel.DataAnnotations;
namespace backend.src.Models;

public class CustomerModel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    [MaxLength(12)]
    public string Phone { get; set; } = string.Empty;
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required]
    [RegularExpression(@"^\d{12}$")]
    public string NationalId { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public Guid TierId { get; set; }
    public MembershipTierModel MembershipTier { get; set; } = null!;
    public int EligibleSpend { get; set; }
    public bool IsFlagged = false;
    public string FlagReason = string.Empty;
    public DateTime CreatedAt = DateTime.UtcNow;
}
