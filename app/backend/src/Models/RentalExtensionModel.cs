using System.ComponentModel.DataAnnotations;
namespace backend.src.Models;
public class RentalExtensionModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RentalLineId { get; set; }
    public short Seq { get; set; }
    public DateTime ExtendedAt { get; set; } = DateTime.UtcNow;
    public short DaysAdded { get; set; }
    public long ExtensionFee { get; set; }
    public long LatePenaltyLocked { get; set; }
    public DateTime OldDueAt { get; set; }
    public DateTime NewDueAt { get; set; }
    public Guid PerformedBy { get; set; }
}
