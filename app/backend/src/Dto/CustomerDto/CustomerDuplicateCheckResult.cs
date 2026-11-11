namespace backend.src.Dto.CustomerDto;

public class CustomerDuplicateCheckResult
{
    public bool IsDuplicate { get; set; }
    public string NormalizedPhone { get; set; } = string.Empty;
    public CustomerDto? ExistingCustomer { get; set; }
}
