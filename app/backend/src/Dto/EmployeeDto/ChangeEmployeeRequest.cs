using backend.src.Models.Enums;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.src.Dto.EmployeeDto;

public sealed record ChangeEmployeeRequest(
    [property: JsonRequired] RoleName RoleName,  //Do JsonText mac dinh doc tren property, khong doc tren parameter
    [Required] string Reason);
