namespace backend.src.Helpers;

public static class VietnamTimeHelper
{
    public static readonly TimeZoneInfo VietnamTimeZone = ResolveVietnamTimeZone();

    private static TimeZoneInfo ResolveVietnamTimeZone()
    {
        if (TimeZoneInfo.TryFindSystemTimeZoneById("Asia/Ho_Chi_Minh", out var iana))
        {
            return iana;
        }

        if (TimeZoneInfo.TryFindSystemTimeZoneById("SE Asia Standard Time", out var windows))
        {
            return windows;
        }

        return TimeZoneInfo.CreateCustomTimeZone(
            "Asia/Ho_Chi_Minh",
            TimeSpan.FromHours(7),
            "(UTC+07:00) Ho Chi Minh City",
            "Indochina Time");
    }

    public static DateTime ToVietnamTime(DateTime utcDateTime)
    {
        var utc = utcDateTime.Kind == DateTimeKind.Utc
            ? utcDateTime
            : DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(utc, VietnamTimeZone);
    }

    public static DateOnly TodayVietnam(DateTime utcNow)
        => DateOnly.FromDateTime(ToVietnamTime(utcNow));

    public static (DateTime UtcStart, DateTime UtcEndExclusive) GetDayRangeUtc(DateOnly vnDate)
        => GetDateRangeUtc(vnDate, vnDate);

    public static (DateTime UtcStart, DateTime UtcEndExclusive) GetDateRangeUtc(DateOnly fromInclusive, DateOnly toInclusive)
    {
        if (toInclusive < fromInclusive)
        {
            (fromInclusive, toInclusive) = (toInclusive, fromInclusive);
        }

        var localStart = fromInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        var localEndExclusive = toInclusive.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return (
            TimeZoneInfo.ConvertTimeToUtc(localStart, VietnamTimeZone),
            TimeZoneInfo.ConvertTimeToUtc(localEndExclusive, VietnamTimeZone));
    }

    public static (DateTime UtcStart, DateTime UtcEndExclusive, DateOnly FromVn, DateOnly ToVn) GetMonthRangeUtc(int year, int month)
    {
        var from = new DateOnly(year, month, 1);
        var to = new DateOnly(year, month, DateTime.DaysInMonth(year, month));
        var (startUtc, endUtc) = GetDateRangeUtc(from, to);
        return (startUtc, endUtc, from, to);
    }

    public static (DateTime UtcStart, DateTime UtcEndExclusive, DateOnly FromVn, DateOnly ToVn) GetQuarterRangeUtc(int year, int quarter)
    {
        var startMonth = (quarter - 1) * 3 + 1;
        var endMonth = startMonth + 2;
        var from = new DateOnly(year, startMonth, 1);
        var to = new DateOnly(year, endMonth, DateTime.DaysInMonth(year, endMonth));
        var (startUtc, endUtc) = GetDateRangeUtc(from, to);
        return (startUtc, endUtc, from, to);
    }

    public static DateTime ConvertVnStartOfDayToUtc(DateTime input)
    {
        if (input.Kind == DateTimeKind.Utc)
        {
            return input;
        }

        if (input.Kind == DateTimeKind.Local)
        {
            return input.ToUniversalTime();
        }

        return TimeZoneInfo.ConvertTimeToUtc(input, VietnamTimeZone);
    }
}
