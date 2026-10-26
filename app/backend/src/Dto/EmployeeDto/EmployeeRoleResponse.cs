using backend.src.Models.Enums;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace backend.src.Dto.EmployeeDto;

public record EmployeeRoleResponse(Guid EmployeeId , RoleName PreviousRole , RoleName CurrentRole , DateTime ChangedAt)
{
    
}
