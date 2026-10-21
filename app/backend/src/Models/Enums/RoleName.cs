//https://dev.to/karenpayneoregon/using-enum-with-ef-core-20go
namespace backend.src.Models.Enums;

public enum RoleName
{
    ADMIN, CASHIER, INVENTORY_MANAGER
}
// if (string.Equals(role, RoleName.ADMIN.ToString(),
//                   StringComparison.OrdinalIgnoreCase))