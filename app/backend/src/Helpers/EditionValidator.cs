using backend.src.Data;
using backend.src.Exceptions;
using backend.src.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public record NormalizedEditionMetadata(
    string? Isbn,
    string? EditionStatement,
    string? PrintingStatement,
    string? Format,
    string? Publisher,
    string? CoverImageUrl,
    long CoverPrice,
    int MinStockSale,
    int MinStockRental
);

public static class EditionValidator
{
    public static NormalizedEditionMetadata NormalizeAndValidate(
        string? isbn,
        string? editionStatement,
        string? printingStatement,
        string? format,
        string? publisher,
        string? coverImageUrl,
        long coverPrice,
        int minStockSale,
        int minStockRental)
    {
        if (coverPrice < 0)
        {
            throw new BadRequestException("Giá bìa phải lớn hơn hoặc bằng 0.");
        }

        if (minStockSale < 0)
        {
            throw new BadRequestException("Ngưỡng tồn tối thiểu kênh bán phải lớn hơn hoặc bằng 0.");
        }

        if (minStockRental < 0)
        {
            throw new BadRequestException("Ngưỡng tồn tối thiểu kênh thuê phải lớn hơn hoặc bằng 0.");
        }

        var trimmedIsbn = string.IsNullOrWhiteSpace(isbn) ? null : isbn.Trim();
        if (trimmedIsbn?.Length > 20)
        {
            throw new BadRequestException("ISBN không được vượt quá 20 ký tự.");
        }

        var trimmedEditionStatement = string.IsNullOrWhiteSpace(editionStatement) ? null : editionStatement.Trim();
        if (trimmedEditionStatement?.Length > 100)
        {
            throw new BadRequestException("Thông tin ấn bản không được vượt quá 100 ký tự.");
        }

        var trimmedPrintingStatement = string.IsNullOrWhiteSpace(printingStatement) ? null : printingStatement.Trim();
        if (trimmedPrintingStatement?.Length > 100)
        {
            throw new BadRequestException("Thông tin lần in không được vượt quá 100 ký tự.");
        }

        var trimmedFormat = string.IsNullOrWhiteSpace(format) ? null : format.Trim();
        if (trimmedFormat?.Length > 100)
        {
            throw new BadRequestException("Định dạng không được vượt quá 100 ký tự.");
        }

        var trimmedPublisher = string.IsNullOrWhiteSpace(publisher) ? null : publisher.Trim();
        if (trimmedPublisher?.Length > 255)
        {
            throw new BadRequestException("Nhà xuất bản không được vượt quá 255 ký tự.");
        }

        var trimmedCoverImageUrl = string.IsNullOrWhiteSpace(coverImageUrl) ? null : coverImageUrl.Trim();

        return new NormalizedEditionMetadata(
            trimmedIsbn,
            trimmedEditionStatement,
            trimmedPrintingStatement,
            trimmedFormat,
            trimmedPublisher,
            trimmedCoverImageUrl,
            coverPrice,
            minStockSale,
            minStockRental
        );
    }

    public static async Task<TitleModel> EnsureTitleValidForEditionAsync(
        AppDbContext dbContext,
        Guid titleId,
        bool editionIsActive,
        CancellationToken cancellationToken = default)
    {
        if (titleId == Guid.Empty)
        {
            throw new BadRequestException("TitleId không hợp lệ.");
        }

        var title = await dbContext.Titles.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == titleId, cancellationToken);

        if (title == null)
        {
            throw new NotFoundException($"Đầu sách với ID '{titleId}' không tồn tại.");
        }

        if (!title.IsActive && editionIsActive)
        {
            throw new BadRequestException("Không thể tạo hoặc gán ấn bản hoạt động cho đầu sách đang bị ngừng sử dụng.");
        }

        return title;
    }

    public static async Task EnsureNoDuplicateAsync(
        AppDbContext dbContext,
        Guid titleId,
        NormalizedEditionMetadata metadata,
        short? publishYear,
        Guid? excludeEditionId = null,
        CancellationToken cancellationToken = default)
    {
        var duplicateExists = await dbContext.Editions.AnyAsync(
            e => (!excludeEditionId.HasValue || e.Id != excludeEditionId.Value) &&
                 e.TitleId == titleId &&
                 e.Isbn == metadata.Isbn &&
                 e.EditionStatement == metadata.EditionStatement &&
                 e.PrintingStatement == metadata.PrintingStatement &&
                 e.Format == metadata.Format &&
                 e.PublishYear == publishYear,
            cancellationToken);

        if (duplicateExists)
        {
            throw new ConflictException("Ấn bản tương tự của đầu sách này đã tồn tại trong hệ thống.");
        }
    }

    public static async Task<(Guid? ConfirmedBy, string? ConfirmedByName, DateTime? ConfirmedAt)> ResolveConfirmationAsync(
        AppDbContext dbContext,
        Guid? confirmedBy,
        DateTime? existingConfirmedAt = null,
        CancellationToken cancellationToken = default)
    {
        if (!confirmedBy.HasValue)
        {
            return (null, null, existingConfirmedAt);
        }

        var employee = await dbContext.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == confirmedBy.Value, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException($"Nhân viên với ID '{confirmedBy.Value}' không tồn tại.");
        }

        return (confirmedBy, employee.FullName, existingConfirmedAt ?? DateTime.UtcNow);
    }

    public static async Task EnsureDeletableAsync(
        AppDbContext dbContext,
        Guid editionId,
        CancellationToken cancellationToken = default)
    {
        var hasCopies = await dbContext.BookCopies.AnyAsync(c => c.EditionId == editionId, cancellationToken);
        if (hasCopies)
        {
            throw new BadRequestException("Không thể xóa ấn bản này vì đã có các bản sách vật lý liên kết. Vui lòng chuyển trạng thái sang ngừng sử dụng thay vì xóa.");
        }

        var hasReceiptLines = await dbContext.StockReceiptLines.AnyAsync(s => s.EditionId == editionId, cancellationToken);
        if (hasReceiptLines)
        {
            throw new BadRequestException("Không thể xóa ấn bản này vì đã phát sinh dòng phiếu nhập kho liên kết. Vui lòng chuyển trạng thái sang ngừng sử dụng thay vì xóa.");
        }
    }
}