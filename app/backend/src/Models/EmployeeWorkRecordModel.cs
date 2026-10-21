using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class EmployeeWorkRecordModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeId { get; set; }
    public DateOnly WorkDate { get; set; }
    public short ShiftNo { get; set; } = 1;
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public AttendanceStatus AttendanceStatus { get; set; } = AttendanceStatus.PRESENT;
    public int WorkedMinutes { get; set; }
    public int OvertimeMinutes { get; set; }
    public long ShiftSalary { get; set; }
    public WorkRecordPaymentStatus PaymentStatus { get; set; } = WorkRecordPaymentStatus.UNPAID;
    public string? AdjustmentReason { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
