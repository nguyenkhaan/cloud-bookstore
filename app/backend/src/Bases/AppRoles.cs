using backend.src.Models.Enums;

namespace backend.src.Bases;

public static class AppRoles
{
    public const string Admin = nameof(RoleName.ADMIN);
    public const string Cashier = nameof(RoleName.CASHIER);
    public const string InventoryManager = nameof(RoleName.INVENTORY_MANAGER);
    public const string AdminOrCashier = $"{Admin},{Cashier}";
    public const string AdminOrInventory = $"{Admin},{InventoryManager}";
}