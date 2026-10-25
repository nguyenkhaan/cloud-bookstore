namespace backend.src.Bases;

/// Tên policy phân quyền theo ma trận trong docs/product/ROLES.md.
public static class AppPolicies
{
    public const string AdminOnly = "AdminOnly";               // Admin
    public const string CounterAccess = "CounterAccess";       // Admin, Nhân viên (quầy)
    public const string InventoryAccess = "InventoryAccess";   // Admin, Quản lý kho
}