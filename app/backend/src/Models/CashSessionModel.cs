using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class CashSessionModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OpenedBy { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public long OpeningBalance { get; set; }
    public CashSessionStatus Status { get; set; } = CashSessionStatus.OPEN;
    public long? ClosingExpected { get; set; }
    public long? ClosingCounted { get; set; }
    public string? VarianceNote { get; set; }
    public Guid? VarianceApprovedBy { get; set; }
    public Guid? ClosedBy { get; set; }
    public DateTime? ClosedAt { get; set; }
}
