# Spec: CUS-003 — Tra cứu lịch sử giao dịch và nghĩa vụ khách hàng

## Status
Draft (chờ Product Owner duyệt → Accepted)

## Objective
Nhân viên xem lịch sử mua, thuê–trả, thu mua, vi phạm và nghĩa vụ chưa xử lý của một khách ngay trong hồ sơ 360°; mỗi số tiền truy được về chứng từ nguồn.

## References
- Feature: `CUS-003`, `MEMBER-001`, `MEMBER-005`
- Rules: `BR-GEN-002`, `BR-GEN-008`, `BR-MEMBER-001`–`BR-MEMBER-008`, `BR-RENT-003`, `BR-RETURN-002/003`
- Decision: `PDR-003`; phụ thuộc `OQ-003`, `OQ-004`, `OQ-011` (chỉ đọc số đã lưu, không tự tính phạt)
- Figma: `SCR-CRM-02` (node `30:25106`)

## Actors and Permissions
| Endpoint | ADMIN | CASHIER | INVENTORY_MANAGER |
|---|:--:|:--:|:--:|
| summary, rentals, sales, violations | ✔ | ✔ | ✘ (403) |
| buybacks | ✔ | ✔ | ✔ |

## API (chỉ GET, không dính CSRF)
Base: `/api/customers/{customerId}/history`
- `GET /summary`
- `GET /rentals?Page&PageSize&Status&From&To` — theo phiếu thuê (không gồm `DRAFT`)
- `GET /sales?...` — hóa đơn (không gồm `DRAFT`)
- `GET /buybacks?...` — phiếu thu mua `CUSTOMER_BUYBACK` (không gồm `DRAFT`)
- `GET /violations?...` — theo dòng thuê; `Status` ∈ `OPEN_OVERDUE | AWAITING_PAYMENT | SETTLED`
- Lỗi: 404 khách không tồn tại; 400 `Status` sai hoặc `From > To`.

## Business definitions
- Chi tiêu hợp lệ (tính từ chứng từ) = Σ `FinalPrice` dòng `ACTIVE` của hóa đơn `PAID` + Σ (`ChargedRentFee` + `ChargedExtensionFee`) của dòng thuộc `Return` `SETTLED`.
- Không tính: cọc, phạt trễ, bồi thường, cọc giữ do mất, dòng `REVERSED`, thu mua.
- Chỉ tin các cột `Charged*`, `LateDays`, `LostRetainedAmount` khi `Return` là `SETTLED`.
- Nghĩa vụ chưa xử lý = `max(0, AdditionalAmountDue − AdditionalAmountPaid)` của `Return` chưa `CANCELLED`; cộng phiếu `ACTIVE` có dòng `RENTING` quá `DueAt` (chỉ báo trạng thái, không ước tính phạt).
- `blocksNewRental` = `IsFlagged` hoặc có phiếu quá hạn hoặc còn nghĩa vụ (`BR-RENT-003`).
- Đảo: dòng hóa đơn `REVERSED` vẫn hiện nhưng `countedAmount` không cộng.
- Chứng từ nguồn: BE trả `id` + số chứng từ; FE link khi route chứng từ tồn tại (hiện chỉ có bản sách `/catalog/copies/:id`).

## Acceptance Criteria
- [ ] Mỗi số tiền trên timeline có mã chứng từ nguồn.
- [ ] Dòng đảo không cộng vào `countedAmount`/`salesSpend`.
- [ ] Cọc, phạt, bồi thường, thu mua không cộng vào chi tiêu.
- [ ] Phân trang + lọc trạng thái + khoảng ngày hoạt động trên từng tab.
- [ ] `INVENTORY_MANAGER` nhận 403 ở mọi endpoint trừ `buybacks`.
- [ ] Khách chưa có giao dịch hiển thị trạng thái rỗng, không lỗi.

## Out of scope
Ghi/tính lại `EligibleSpend` (phase 07/09); trang chi tiết hóa đơn/phiếu thuê/phiếu thu mua.