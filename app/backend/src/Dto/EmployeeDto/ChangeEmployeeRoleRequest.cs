using backend.src.Models.Enums;

namespace backend.src.Dto.EmployeeDto;

public record class ChangeEmployeeRoleRequest(RoleName Name, string Reason) { }
