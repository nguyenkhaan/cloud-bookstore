namespace backend.src.Dto.CustomerDto;

public class CustomerQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public Guid? TierId { get; set; }
    public bool? IsFlagged { get; set; }
}
