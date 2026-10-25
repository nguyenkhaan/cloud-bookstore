using backend.src.Bases;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

/// Endpoint tạm để kiểm chứng phân quyền 3 vai trò (UI, curl, integration test).
/// Xóa file này khi P02-S04 áp ma trận quyền lên các API nghiệp vụ thật.
[ApiController]
[Route("api/access-check")]
public class AccessCheckController : ControllerBase
{
    [Authorize(Policy = AppPolicies.AdminOnly)]
    [HttpGet("admin")]
    public IActionResult Admin() => Ok(new { allowed = true, policy = AppPolicies.AdminOnly });

    [Authorize(Policy = AppPolicies.CounterAccess)]
    [HttpGet("counter")]
    public IActionResult Counter() => Ok(new { allowed = true, policy = AppPolicies.CounterAccess });

    [Authorize(Policy = AppPolicies.InventoryAccess)]
    [HttpGet("inventory")]
    public IActionResult Inventory() => Ok(new { allowed = true, policy = AppPolicies.InventoryAccess });
}