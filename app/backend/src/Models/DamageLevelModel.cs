using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class DamageLevelModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public DamageLevel Level { get; set; }
    public decimal PenaltyPct { get; set; }
    public BookCopyStatus CopyStatusAfter { get; set; } = BookCopyStatus.DAMAGED;
}
