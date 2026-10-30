using backend.src.Data;
using backend.src.Dto.BookSeriesDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
using backend.src.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class BookSeriesService(AppDbContext dbContext)
{
    public async Task<PagedResult<BookSeriesResponse>> GetBookSeriesAsync(
        BookSeriesQuery query,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = dbContext.BookSeries.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Name))
        {
            var trimmedName = query.Name.Trim().ToLower();
            baseQuery = baseQuery.Where(s => s.Name.ToLower().Contains(trimmedName));
        }

        if (query.IsActive.HasValue)
        {
            baseQuery = baseQuery.Where(s => s.IsActive == query.IsActive.Value);
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var items = await (from s in baseQuery
                           orderby s.Name
                           select new BookSeriesResponse(
                               s.Id,
                               s.Name,
                               s.Description,
                               s.IsActive,
                               s.CreatedAt,
                               dbContext.Titles.Count(t => t.SeriesId == s.Id)
                           ))
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<BookSeriesResponse>(items, totalCount, query.Page, query.PageSize);
    }

    public async Task<BookSeriesDetailResponse> GetBookSeriesByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        var titles = await dbContext.Titles.AsNoTracking()
            .Where(t => t.SeriesId == id)
            .OrderBy(t => t.VolumeLabel)
            .ThenBy(t => t.Name)
            .Select(t => new BookSeriesTitleSummary(
                t.Id,
                t.Name,
                t.VolumeLabel,
                t.Author,
                t.OriginalPublishYear,
                t.IsActive
            ))
            .ToListAsync(cancellationToken);

        return new BookSeriesDetailResponse(
            series.Id,
            series.Name,
            series.Description,
            series.IsActive,
            series.CreatedAt,
            titles
        );
    }

    public async Task<BookSeriesResponse> CreateBookSeriesAsync(
        CreateBookSeriesRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên bộ sách không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 255)
        {
            throw new BadRequestException("Tên bộ sách không được vượt quá 255 ký tự.");
        }

        var exists = await dbContext.BookSeries.AnyAsync(
            s => s.Name.ToLower() == trimmedName.ToLower(),
            cancellationToken);

        if (exists)
        {
            throw new ConflictException("Bộ sách cùng tên đã tồn tại.");
        }

        var series = new BookSeriesModel
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.BookSeries.Add(series);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new BookSeriesResponse(
            series.Id,
            series.Name,
            series.Description,
            series.IsActive,
            series.CreatedAt,
            TitlesCount: 0
        );
    }

    public async Task<BookSeriesResponse> UpdateBookSeriesAsync(
        Guid id,
        UpdateBookSeriesRequest request,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên bộ sách không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 255)
        {
            throw new BadRequestException("Tên bộ sách không được vượt quá 255 ký tự.");
        }

        var duplicateExists = await dbContext.BookSeries.AnyAsync(
            s => s.Id != id && s.Name.ToLower() == trimmedName.ToLower(),
            cancellationToken);

        if (duplicateExists)
        {
            throw new ConflictException("Bộ sách cùng tên đã tồn tại.");
        }

        series.Name = trimmedName;
        series.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        if (request.IsActive.HasValue)
        {
            series.IsActive = request.IsActive.Value;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var titlesCount = await dbContext.Titles.CountAsync(t => t.SeriesId == id, cancellationToken);

        return new BookSeriesResponse(
            series.Id,
            series.Name,
            series.Description,
            series.IsActive,
            series.CreatedAt,
            titlesCount
        );
    }

    public async Task<BookSeriesResponse> UpdateBookSeriesStatusAsync(
        Guid id,
        UpdateBookSeriesStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        series.IsActive = request.IsActive;

        if (!request.IsActive)
        {
            var activeTitles = await dbContext.Titles
                .Where(t => t.SeriesId == id && t.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var title in activeTitles)
            {
                title.IsActive = false;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var titlesCount = await dbContext.Titles.CountAsync(t => t.SeriesId == id, cancellationToken);

        return new BookSeriesResponse(
            series.Id,
            series.Name,
            series.Description,
            series.IsActive,
            series.CreatedAt,
            titlesCount
        );
    }
}