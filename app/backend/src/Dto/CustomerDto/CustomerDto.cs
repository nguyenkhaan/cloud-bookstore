namespace backend.src.Dto.CustomerDto;

public class CustomerDto
{
    public Guid Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? NationalId { get; set; }
    public string? Address { get; set; }
    public Guid TierId { get; set; }
    public string TierName { get; set; } = "REGULAR";
    public short TierRank { get; set; } = 1;
    public long EligibleSpend { get; set; }
    public bool IsFlagged { get; set; }
    public string? FlagReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CustomerDetailDto : CustomerDto
{
}

public class CustomerStatsDto
{
    public int TotalCount { get; set; }
    public int SilverCount { get; set; }
    public int GoldCount { get; set; }
    public int FlaggedCount { get; set; }
}
