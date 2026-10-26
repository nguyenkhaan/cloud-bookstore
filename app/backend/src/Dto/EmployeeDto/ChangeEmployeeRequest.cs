using backend.src.Models.Enums;

namespace backend.src.Dto.EmployeeDto;

public record class ChangeEmployeeRequest(RoleName RoleName , string Reason) { } //Mac dinh RoleName se duoc parse tu enum sang string
