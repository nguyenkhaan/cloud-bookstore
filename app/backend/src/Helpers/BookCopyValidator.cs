using backend.src.Data;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public record NormalizedBookCopyData(
    string? ConditionNote,
    long? SellingPrice,
    long? RentalRate,
    string? ShelfCode
);

public static class BookCopyValidator
{
    public const string BarcodePrefix = "BC";
    public const string BarcodeSequenceName = "seq_copy_barcode";

    private static readonly HashSet<BookCopyStatus> ManualTargetStatuses =
    [
        BookCopyStatus.AVAILABLE,
        BookCopyStatus.INVENTORY_LOCKED,
        BookCopyStatus.DAMAGED,
        BookCopyStatus.LOST,
        BookCopyStatus.DISPOSED,
        BookCopyStatus.DISCONTINUED
    ];

    private static readonly HashSet<BookCopyStatus> LockedSourceStatuses =
    [
        BookCopyStatus.RENTED,
        BookCopyStatus.SOLD,
        BookCopyStatus.DISPOSED
    ];

    public static string FormatBarcode(long sequenceValue) => $"{BarcodePrefix}{sequenceValue:D8}";

    public static string? NormalizeBarcode(string? copyBarcode)
        => string.IsNullOrWhiteSpace(copyBarcode) ? null : copyBarcode.Trim().ToUpperInvariant();

    public static string RequireReason(string? reason)
    {
        var trimmed = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (trimmed is null)
        {
            throw new BadRequestException("Lý do thay đổi không được để trống.");
        }

        if (trimmed.Length > 500)
        {
            throw new BadRequestException("Lý do không được vượt quá 500 ký tự.");
        }

        return trimmed;
    }

    public static string ReasonOrDefault(string? reason, string fallback)
    {
        var trimmed = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (trimmed?.Length > 500)
        {
            throw new BadRequestException("Lý do không được vượt quá 500 ký tự.");
        }

        return trimmed ?? fallback;
    }

    public static NormalizedBookCopyData NormalizeAndValidate(
        string? conditionNote,
        long? sellingPrice,
        long? rentalRate,
        string? shelfCode)
    {
        if (sellingPrice < 0)
        {
            throw new BadRequestException("Giá bán (SellingPrice) phải lớn hơn hoặc bằng 0.");
        }

        if (rentalRate < 0)
        {
            throw new BadRequestException("Giá thuê (RentalRate) phải lớn hơn hoặc bằng 0.");
        }

        var trimmedShelf = string.IsNullOrWhiteSpace(shelfCode) ? null : shelfCode.Trim();
        if (trimmedShelf?.Length > 30)
        {
            throw new BadRequestException("Vị trí kệ không được vượt quá 30 ký tự.");
        }

        var trimmedNote = string.IsNullOrWhiteSpace(conditionNote) ? null : conditionNote.Trim();

        return new NormalizedBookCopyData(trimmedNote, sellingPrice, rentalRate, trimmedShelf);
    }

    public static void EnsureEditable(BookCopyModel copy)
    {
        if (copy.Status is BookCopyStatus.RENTED or BookCopyStatus.SOLD)
        {
            throw new ConflictException(
                $"Bản sách đang ở trạng thái {copy.Status} nên không thể chỉnh sửa thông tin.");
        }
    }

    public static void EnsureStatusTransitionAllowed(BookCopyStatus from, BookCopyStatus to, bool isAdmin)
    {
        if (from == to)
        {
            throw new BadRequestException($"Bản sách đã ở trạng thái {to}.");
        }

        if (!ManualTargetStatuses.Contains(to))
        {
            throw new BadRequestException(
                $"Không thể chuyển thủ công sang trạng thái {to}. " +
                "RENTED/SOLD chỉ được đặt bởi nghiệp vụ thuê/bán, PENDING_RECEIPT là trạng thái khởi tạo.");
        }

        if (LockedSourceStatuses.Contains(from))
        {
            throw new BadRequestException($"Bản sách đang ở trạng thái {from} nên không thể chuyển trạng thái thủ công.");
        }

        if ((from is BookCopyStatus.DAMAGED or BookCopyStatus.LOST) && !isAdmin)
        {
            throw new ForbiddenException($"Chỉ ADMIN mới được chuyển bản sách khỏi trạng thái {from}.");
        }
    }

    public static void EnsureAvailableRequirements(BookCopyModel copy, bool editionExists = true)
    {
        var missing = new List<string>();

        if (copy.EditionId == Guid.Empty || !editionExists)
        {
            missing.Add("ấn bản (EditionId)");
        }

        if (string.IsNullOrWhiteSpace(copy.CopyBarcode))
        {
            missing.Add("CopyBarcode");
        }

        if (!Enum.IsDefined(copy.ConditionGrade))
        {
            missing.Add("tình trạng (ConditionGrade)");
        }

        if (copy.SellingPrice is not > 0)
        {
            missing.Add("giá bán (SellingPrice)");
        }

        if (copy.Availability != BookChannelAvailability.SALE_ONLY && copy.RentalRate is not > 0)
        {
            missing.Add("giá thuê (RentalRate)");
        }

        if (missing.Count > 0)
        {
            throw new BadRequestException(
                $"Không thể để bản sách ở trạng thái AVAILABLE khi thiếu: {string.Join(", ", missing)}.");
        }
    }

    public static async Task EnsureNoActiveReferenceAsync(
        AppDbContext dbContext,
        Guid copyId,
        CancellationToken cancellationToken = default)
    {
        var hasActiveRental = await dbContext.RentalLines.AnyAsync(
            l => l.CopyId == copyId &&
                 (l.Status == RentalLineStatus.PENDING_DEPOSIT || l.Status == RentalLineStatus.RENTING),
            cancellationToken);
        if (hasActiveRental)
        {
            throw new ConflictException("Bản sách đang gắn với một phiếu thuê chưa kết thúc nên không thể thay đổi.");
        }

        var hasActiveSale = await dbContext.SaleInvoiceLines.AnyAsync(
            l => l.CopyId == copyId && l.Status == SaleInvoiceLineStatus.ACTIVE,
            cancellationToken);
        if (hasActiveSale)
        {
            throw new ConflictException("Bản sách đang gắn với một hóa đơn bán đang hiệu lực nên không thể thay đổi.");
        }
    }
}