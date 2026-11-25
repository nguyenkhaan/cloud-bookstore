using System.Reflection;
using System.Text.Json;
using backend.src.Configurations;
using backend.src.Data;
using backend.src.Dto.Settings;
using backend.src.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public sealed class RolePermissionService(AppDbContext db)
{
    public const string SettingKey = "rbac.permissions_v1";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public static readonly IReadOnlyList<RbacMatrixItemDto> Defaults = BuildCatalog();

    public async Task<IReadOnlyList<RbacMatrixItemDto>> GetItemsAsync(CancellationToken ct = default)
    {
        var stored = await db.SystemSettings.AsNoTracking().SingleOrDefaultAsync(s => s.Key == SettingKey, ct);
        if (stored == null) return Defaults;
        var items = JsonSerializer.Deserialize<List<RbacMatrixItemDto>>(stored.Description ?? "", JsonOptions)
            ?? throw new JsonException("Invalid permission configuration.");
        Validate(items, requireComplete: false);
        var grants = items.ToDictionary(item => item.PermissionCode);
        return Defaults.Select(item => grants.TryGetValue(item.PermissionCode, out var grant)
            ? item with { CashierAllowed = grant.CashierAllowed, WarehouseAllowed = grant.WarehouseAllowed, AdminAllowed = grant.AdminAllowed }
            : item with { CashierAllowed = false, WarehouseAllowed = false, AdminAllowed = item.AdminOnly }).ToArray();
    }

    public async Task<bool> IsAllowedAsync(string code, string? role, CancellationToken ct = default)
    {
        if (role is not ("ADMIN" or "CASHIER" or "INVENTORY_MANAGER")) return false;
        var item = (await GetItemsAsync(ct)).SingleOrDefault(item => item.PermissionCode == code);
        return role switch { "ADMIN" => item?.AdminAllowed == true, "CASHIER" => item?.CashierAllowed == true,
            "INVENTORY_MANAGER" => item?.WarehouseAllowed == true, _ => false };
    }

    public static void Validate(IReadOnlyList<RbacMatrixItemDto>? items, bool requireComplete = true)
    {
        if (items == null || items.Count == 0 || (requireComplete && items.Count != Defaults.Count))
            throw new BadRequestException("Danh mục quyền phải đầy đủ; tải lại bảng trước khi lưu.");
        var seen = new HashSet<string>();
        foreach (var item in items)
        {
            var known = item == null ? null : Defaults.SingleOrDefault(x => x.PermissionCode == item.PermissionCode);
            if (known == null || !seen.Add(known.PermissionCode))
                throw new BadRequestException("Danh mục có quyền không hợp lệ hoặc trùng lặp.");
            if (known.AdminOnly && (item!.CashierAllowed || item.WarehouseAllowed || !item.AdminAllowed))
                throw new BadRequestException("Quyền chỉ dành Admin không thể thay đổi.");
        }
    }

    private static IReadOnlyList<RbacMatrixItemDto> BuildCatalog()
    {
        var modules = new Dictionary<string, string>
        {
            ["BookSeries"] = "Bộ sách", ["BookTitles"] = "Đầu sách", ["Editions"] = "Ấn bản",
            ["BookCopies"] = "Bản sách vật lý", ["Categories"] = "Thể loại", ["Customers"] = "Khách hàng",
            ["CustomerHistory"] = "Lịch sử khách hàng", ["Membership"] = "Chính sách thành viên",
            ["InventoryAdjustmentRequests"] = "Điều chỉnh tồn kho", ["ApprovalsOverview"] = "Tổng hợp phê duyệt",
            ["BuybackApprovals"] = "Phê duyệt thu mua", ["DamagePenaltyApprovals"] = "Phê duyệt phạt hư hỏng",
            ["DisposalReversalApprovals"] = "Phê duyệt xuất hủy/đảo giao dịch", ["AuditLog"] = "Nhật ký kiểm toán",
            ["Settings"] = "Cấu hình hệ thống", ["Employee"] = "Vai trò nhân viên", ["Employees"] = "Quản lý nhân viên",
            ["HrRequests"] = "Đơn xét duyệt", ["Uploads"] = "Tải ảnh"
        };
        var result = new List<RbacMatrixItemDto>();
        foreach (var controller in typeof(RolePermissionService).Assembly.GetTypes().Where(t => typeof(ControllerBase).IsAssignableFrom(t)))
        {
            var name = controller.Name.Replace("Controller", "");
            if (!modules.TryGetValue(name, out var module)) continue;
            foreach (var method in controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            {
                var http = method.GetCustomAttributes<HttpMethodAttribute>().FirstOrDefault();
                if (http == null) continue;
                var attributes = controller.GetCustomAttributes<AuthorizeAttribute>().Concat(method.GetCustomAttributes<AuthorizeAttribute>()).ToArray();
                var roles = attributes.Select(a => a is PermissionAttribute p ? p.DefaultRoles : a.Roles)
                    .Where(r => r != null).Select(r => r!.Split(',').ToHashSet()).ToArray();
                if (roles.Length == 0) continue;
                bool Has(string role) => roles.All(r => r.Contains(role));
                var verb = http.HttpMethods.First();
                var operation = verb switch { "GET" => "Xem", "POST" => "Tạo", "DELETE" => "Xóa", _ => "Cập nhật" };
                var detail = method.Name switch
                {
                    "GetRentalPolicy" or "UpdateRentalPolicy" => "chính sách thuê",
                    "GetMembershipPolicy" or "UpdateMembershipPolicy" => "chính sách thành viên",
                    "GetRbacMatrix" or "UpdateRbacMatrix" => "ma trận phân quyền",
                    "GetIntegrations" or "UpdateIntegrations" => "tích hợp",
                    "GetHistory" => "lịch sử cấu hình", "GetSales" => "mua sách", "GetRentals" => "thuê sách",
                    "GetBuybacks" => "thu mua", "GetViolations" => "vi phạm",
                    "GetSummary" => "tổng hợp", "CheckDuplicate" => "kiểm tra trùng khách hàng",
                    "GetAvailableReceiptLines" => "dòng nhập kho còn số lượng", "CreateSignature" => "chữ ký tải ảnh",
                    "ChangeRole" => "vai trò", _ => http.Template switch {
                        null or "" => verb == "GET" ? "danh sách" : "mới",
                        var t when t.Contains("image") => "ảnh", var t when t.Contains("status") => "trạng thái",
                        var t when t.Contains("label") => "nhãn CopyBarcode", var t when t.Contains("barcode") => "tra cứu CopyBarcode",
                        var t when t.Contains("stats") => "thống kê", var t when t.Contains("history") => "lịch sử",
                        var t when t.Contains("cancel") => "hủy yêu cầu", _ => "chi tiết"
                    }
                };
                // Keep distinct existing actions (including image/status operations) independently grantable.
                result.Add(new($"{name}.{method.Name}", $"{operation} · {module} · {detail}", name, module,
                    Has("CASHIER"), Has("INVENTORY_MANAGER"), Has("ADMIN"), !Has("CASHIER") && !Has("INVENTORY_MANAGER")));
            }
        }
        return result.OrderBy(x => x.ModuleTitle).ThenBy(x => x.PermissionCode).ToArray();
    }
}
