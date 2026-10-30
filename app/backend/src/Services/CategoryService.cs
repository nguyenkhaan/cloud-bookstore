using backend.src.Data;
using backend.src.Dto.CategoryDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
using backend.src.Models;
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

    public async Task<CategoryDetailResponse> GetCategoryByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var category = await (from c in dbContext.Categories.AsNoTracking()
                              where c.Id == id
                              join p in dbContext.Categories.AsNoTracking() on c.ParentId equals p.Id into parents
                              from p in parents.DefaultIfEmpty()
                              select new
                              {
                                  c.Id,
                                  c.ParentId,
                                  ParentName = p != null ? p.Name : null,
                                  c.Name,
                                  c.IsActive
                              }).FirstOrDefaultAsync(cancellationToken);

        if (category == null)
        {
            throw new NotFoundException($"Category with ID '{id}' was not found.");
        }

        var subCategories = await dbContext.Categories.AsNoTracking()
            .Where(c => c.ParentId == id)
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse(
                c.Id,
                c.ParentId,
                category.Name,
                c.Name,
                c.IsActive))
            .ToListAsync(cancellationToken);

        return new CategoryDetailResponse(
            category.Id,
            category.ParentId,
            category.ParentName,
            category.Name,
            category.IsActive,
            subCategories);
    }

    public async Task<CategoryResponse> CreateCategoryAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên thể loại không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 100)
        {
            throw new BadRequestException("Tên thể loại không được vượt quá 100 ký tự.");
        }

        string? parentName = null;
        if (request.ParentId.HasValue)
        {
            var parent = await dbContext.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.ParentId.Value, cancellationToken);
            if (parent == null)
            {
                throw new NotFoundException($"Thể loại cha với ID '{request.ParentId}' không tồn tại.");
            }
            parentName = parent.Name;
        }

        var exists = await dbContext.Categories.AnyAsync(
            c => c.ParentId == request.ParentId && c.Name.ToLower() == trimmedName.ToLower(),
            cancellationToken);

        if (exists)
        {
            throw new ConflictException("Thể loại cùng tên đã tồn tại trong cùng cấp phân loại.");
        }

        var category = new CategoryModel
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            ParentId = request.ParentId,
            IsActive = request.IsActive
        };

        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new CategoryResponse(
            category.Id,
            category.ParentId,
            parentName,
            category.Name,
            category.IsActive
        );
    }

    public async Task<CategoryResponse> UpdateCategoryAsync(
        Guid id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var category = await dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (category == null)
        {
            throw new NotFoundException($"Category with ID '{id}' was not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên thể loại không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 100)
        {
            throw new BadRequestException("Tên thể loại không được vượt quá 100 ký tự.");
        }

        string? parentName = null;
        if (request.ParentId.HasValue)
        {
            if (request.ParentId.Value == id)
            {
                throw new BadRequestException("Thể loại không thể chọn chính nó làm thể loại cha.");
            }

            var parent = await dbContext.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.ParentId.Value, cancellationToken);
            if (parent == null)
            {
                throw new NotFoundException($"Thể loại cha với ID '{request.ParentId}' không tồn tại.");
            }
            parentName = parent.Name;

            var currentAncestorId = parent.ParentId;
            while (currentAncestorId.HasValue)
            {
                if (currentAncestorId.Value == id)
                {
                    throw new BadRequestException("Không thể chọn thể loại con làm thể loại cha (tạo vòng lặp phân cấp).");
                }
                var ancestor = await dbContext.Categories.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == currentAncestorId.Value, cancellationToken);
                currentAncestorId = ancestor?.ParentId;
            }
        }

        var duplicateExists = await dbContext.Categories.AnyAsync(
            c => c.Id != id && c.ParentId == request.ParentId && c.Name.ToLower() == trimmedName.ToLower(),
            cancellationToken);

        if (duplicateExists)
        {
            throw new ConflictException("Thể loại cùng tên đã tồn tại trong cùng cấp phân loại.");
        }

        category.Name = trimmedName;
        category.ParentId = request.ParentId;
        if (request.IsActive.HasValue)
        {
            category.IsActive = request.IsActive.Value;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return new CategoryResponse(
            category.Id,
            category.ParentId,
            parentName,
            category.Name,
            category.IsActive
        );
    }
}