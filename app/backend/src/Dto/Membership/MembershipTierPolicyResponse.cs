using backend.src.Models.Enums;

namespace backend.src.Dto.Membership;

public sealed record MembershipTierPolicyResponse(
    MembershipTierName Name,
    long MinEligibleSpend,
    long? NextTierMinEligibleSpend,
    short MaxBooks,
    short MaxRentalDays,
    decimal SaleDiscountPct,
    decimal RentDiscountPct);
