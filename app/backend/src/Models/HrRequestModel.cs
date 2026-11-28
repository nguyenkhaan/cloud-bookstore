using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public sealed class HrRequestModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(32)] public string RequestCode { get; set; } = string.Empty;
    public HrRequestType Type { get; set; }
    public Guid RequesterId { get; set; }
    public DateOnly ApplyDate { get; set; }
    public short ShiftNo { get; set; } = 1;
    public short? TargetShiftNo { get; set; }
    public Guid? ReplacementEmployeeId { get; set; }
    [Required, MaxLength(2000)] public string Reason { get; set; } = string.Empty;
    public DateTime? CorrectCheckInAt { get; set; }
    public DateTime? CorrectCheckOutAt { get; set; }
    [MaxLength(255)] public string? ProofPublicId { get; set; }
    public HrRequestStatus Status { get; set; } = HrRequestStatus.PENDING;
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    [MaxLength(1000)] public string? ReviewNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
