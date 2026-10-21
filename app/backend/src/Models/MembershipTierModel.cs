using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Models;

public class MembershipTierModel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required]
    public MembershipTierName Name { get; set; }
    [Required]
    public long RankOrder { get; set; } = 0L;
    public long MinSpend { get; set; } = 0L;
    public int MaxBooks { get; set; }
    public short MaxRentalDays { get; set; }
    [Precision(5, 2)]
    public decimal RentDiscountPct { get; set; }
    [Precision(5, 2)]
    public decimal SaleDiscountPct { get; set; }
}
