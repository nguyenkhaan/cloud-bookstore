# Phase 06 — Ca két và thanh toán

## Mục tiêu

Tạo nền tiền tệ dùng chung cho bán, thuê–trả, thu mua và lương; đảm bảo idempotency và truy vết.

## Step 1 — Mở và theo dõi ca két

**Feature:** `CASH-001`, `CASH-002`.

- [ ] BE chỉ cho một ca két mở, lưu tiền đầu ca và tính số dư lý thuyết từ payment tiền mặt.
- [ ] FE có màn hình mở ca, trạng thái ca hiện tại và danh sách thu/chi.
- [ ] Test mở trùng, số tiền âm, quyền và thời điểm theo `Asia/Ho_Chi_Minh`.

**Chấp nhận:** Giao dịch tiền mặt không thể ghi khi thiếu ca mở.

**Kiểm chứng:** Constraint/integration test + E2E mở ca.

**Phạm vi:** M.

## Step 2 — Payment ledger và tiền mặt

**Feature:** `PAY-001`, `PAY-006`, `PAY-007`.

- [ ] BE ghi payment vào/ra với idempotency key và đúng một chứng từ nguồn.
- [ ] FE có modal thanh toán tiền mặt, tiền khách đưa/tiền thối và xác nhận rõ.
- [ ] Test retry, payment trùng, source sai loại và giao dịch đảo.

**Chấp nhận:** Payment thành công không sửa/xóa trực tiếp; retry không ghi hai lần.

**Kiểm chứng:** Unit + integration test idempotency.

## Step 3 — VietQR và webhook

**Feature:** `PAY-002`–`PAY-005`.

- [ ] BE sinh QR tham chiếu unique, xác thực/lưu webhook và đối chiếu số tiền/tài khoản theo ADR.
- [ ] FE hiển thị QR, đếm hạn, polling theo request cũ khi mất kết nối và trạng thái cần đối soát.
- [ ] Test chữ ký sai, webhook trùng/đến muộn, thiếu/thừa tiền và timeout.

**Chấp nhận:** Chỉ webhook hợp lệ, khớp đủ mới hoàn tất; sự kiện sai lệch không bị mất.

**Kiểm chứng:** Contract test nhà cung cấp + E2E sandbox.

## Step 4 — Đóng ca và xử lý chênh lệch

**Feature:** `CASH-003`–`CASH-005`.

- [ ] BE tạm chặn thu/chi mới khi đóng, tính chênh lệch và yêu cầu Admin duyệt ngoại lệ.
- [ ] FE hỗ trợ kiểm đếm, giải trình và màn hình duyệt.
- [ ] Test race condition giao dịch lúc đóng ca và ca đã đóng chỉ đọc.

**Chấp nhận:** Không có payment tiền mặt lọt vào ca sau thời điểm đóng.

**Kiểm chứng:** Concurrency test + E2E đóng ca có/không chênh lệch.

## Checkpoint Phase 06

- [ ] Tiền mặt và VietQR đều có happy path cùng fallback.
- [ ] Webhook/idempotency/concurrency test pass.
- [ ] Sổ payment sẵn sàng dùng lại cho các phase giao dịch.

