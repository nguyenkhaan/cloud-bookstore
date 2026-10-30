using backend.src.Data;
using backend.src.Dto.CategoryDto;
using backend.src.Dto.Common;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class CategoryService(AppDbContext dbContext)
{
    public async Task<PagedResult<CategoryResponse>> GetCategoriesAsync(
        CategoryQuery query,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = dbContext.Categories.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Name))
        {
            var trimmedName = query.Name.Trim().ToLower();
            baseQuery = baseQuery.Where(c => c.Name.ToLower().Contains(trimmedName));
        }

        if (query.ParentId.HasValue)
        {
            baseQuery = baseQuery.Where(c => c.ParentId == query.ParentId.Value);
        }

        if (query.IsActive.HasValue)
        {
            baseQuery = baseQuery.Where(c => c.IsActive == query.IsActive.Value);
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var queryWithParent = from c in baseQuery
                              join p in dbContext.Categories.AsNoTracking() on c.ParentId equals p.Id into parents
                              from p in parents.DefaultIfEmpty()
                              orderby c.Name
                              select new CategoryResponse(
                                  c.Id,
                                  c.ParentId,
                                  p != null ? p.Name : null,
                                  c.Name,
                                  c.IsActive
                              );

        var items = await queryWithParent
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<CategoryResponse>(items, totalCount, query.Page, query.PageSize);
    }
}