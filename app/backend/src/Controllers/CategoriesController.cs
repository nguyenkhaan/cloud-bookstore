using backend.src.Dto.CategoryDto;
using backend.src.Dto.Common;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController(CategoryService categoryService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<PagedResult<CategoryResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CategoryResponse>>> GetCategories(
        [FromQuery] CategoryQuery query,
        CancellationToken cancellationToken)
    {
        var result = await categoryService.GetCategoriesAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<CategoryDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryDetailResponse>> GetCategoryById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await categoryService.GetCategoryByIdAsync(id, cancellationToken);
        return Ok(result);
    }
}