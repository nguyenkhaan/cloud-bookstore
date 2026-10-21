using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class RentalLineModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SlipId { get; set; }
    public Guid CopyId { get; set; }
    public long DailyRate { get; set; }
    public long BookPriceSnapshot { get; set; }
    public long DepositAmount { get; set; }
    public decimal RentDiscountPct { get; set; }
    public short InitialDays { get; set; }
    public short TotalDays { get; set; }
    public DateTime DueAt { get; set; }
    public short ExtensionCount { get; set; }
    public long BaseRentFee { get; set; }
    public long ExtensionFeeTotal { get; set; }
    public long LockedLatePenalty { get; set; }
    public RentalLineStatus Status { get; set; } = RentalLineStatus.PENDING_DEPOSIT;
    public Guid? ReturnId { get; set; }
    public CopyCondition? CopyCondition { get; set; }
    public Guid? DamageLevelId { get; set; }
    public string? DamageNote { get; set; }
    public bool DamageNeedsApproval { get; set; }
    public Guid? DamageApprovedBy { get; set; }
    public string? DamageApprovalReason { get; set; }
    public short LateDays { get; set; }
    public long ChargedRentFee { get; set; }
    public long ChargedExtensionFee { get; set; }
    public long ChargedLatePenalty { get; set; }
    public long ChargedDamagePenalty { get; set; }
    public long LostRetainedAmount { get; set; }
    public long RefundAmount { get; set; }
    public long AdditionalAmountDue { get; set; }
    public long AdditionalAmountPaid { get; set; }
}
