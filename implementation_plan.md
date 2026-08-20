# Triển khai tính năng Hủy hợp đồng khách hàng (RECEIVING) kèm hợp đồng đối tác (ORDERING) liên kết

Tính năng này cho phép người dùng khi hủy một hợp đồng với khách hàng (RECEIVING) có thể chọn hủy luôn các hợp đồng phụ đã giao cho đối tác (ORDERING) được liên kết với hợp đồng đó.

## Open Questions
1. **Ngày kết thúc (endDate):** Các hợp đồng đối tác được chọn để hủy cùng sẽ dùng CHUNG ngày hủy (`endDate`) với hợp đồng khách hàng đúng không? (Phương án đề xuất: Dùng chung ngày).
2. **Trạng thái mặc định của Checkbox:** Danh sách các hợp đồng đối tác hiển thị trong Popup có nên được **đánh dấu (checked) sẵn** theo mặc định không? (Phương án đề xuất: Có, để thao tác nhanh hơn).
3. **Transaction (Xử lý đồng thời):** Frontend sẽ gọi API hủy cho từng hợp đồng một cách song song (`Promise.all`). Nếu có 1 hợp đồng thất bại, các hợp đồng khác vẫn được hủy thành công. Điều này có chấp nhận được không, hay cần làm 1 API Bulk Cancel ở Backend để "hủy tất cả hoặc không hủy gì cả"? (Phương án đề xuất: Gọi song song từ Frontend để tận dụng API cũ, do số lượng hợp đồng liên kết thường không quá lớn).

## Proposed Changes

---

### Backend API (Fetching Linked Contracts)

#### [NEW] `GET /api/v1/contracts/{id}/linked-ordering-contracts`
- Tạo mới endpoint trong `backend/app/modules/contract/router.py` để lấy danh sách các hợp đồng ORDERING đang được liên kết (thông qua bảng `contract_ordering_links`) với 1 hợp đồng RECEIVING.
- **Service logic:** Query `ContractOrderingLinkModel` điều kiện `receiving_contract_id == id` và JOIN với bảng `contracts` để lấy thông tin chi tiết của hợp đồng đối tác.
- **Schema:** Tái sử dụng `ContractResponse` hoặc tạo một `LinkedOrderingContractResponse` nhỏ gọn.

---

### Frontend UI & Hooks

#### [MODIFY] `frontend/hooks/useContracts.ts`
- Thêm hook mới `useLinkedOrderingContracts(receivingContractId: string)` để gọi API lấy danh sách hợp đồng liên kết.

#### [NEW] `frontend/components/contracts/LinkedContractsCancelWarningModal.tsx`
- Tạo modal mới với Radix UI Dialog.
- Nhận prop `isOpen`, `receivingContractId`, `onConfirm(selectedIds: string[])`.
- Hiển thị danh sách checkbox các hợp đồng liên kết (nếu có).
- Nếu không có hợp đồng liên kết nào, tự động gọi `onConfirm([])` để chuyển sang bước hủy tiếp theo mà không cần hiển thị.
- UI tuân thủ tuyệt đối quy tắc ngôn ngữ Tiếng Nhật (日本語).

#### [MODIFY] `frontend/components/contracts/DailyContractForm.tsx` (Và Periodic, Other)
- **State mới:** `linkedContractsToCancel: string[]` lưu danh sách ID hợp đồng đối tác được chọn.
- **Logic hiển thị Popup:** Khi bấm nút "解約":
  1. Kiểm tra nếu là hợp đồng RECEIVING: Mở `LinkedContractsCancelWarningModal`.
  2. Tại Modal liên kết, khi bấm OK: Lưu danh sách ID đã chọn, đóng Modal này và mở Modal chọn ngày Hủy chính (`isCancelModalOpen = true`).
- **Logic onSubmit (Hủy):** Cập nhật hàm `handleConfirmCancel` để thực hiện `Promise.all` gọi `updateContractAsync` hủy hợp đồng chính, và hủy tất cả các hợp đồng phụ trong `linkedContractsToCancel` với cùng trạng thái `CANCELLED` và cùng `endDate`.

## Verification Plan
1. **Manual Verification:** 
   - Đăng nhập hệ thống, chọn 1 hợp đồng RECEIVING đang có liên kết ORDERING.
   - Bấm Hủy (解約), kiểm tra xem danh sách hợp đồng đối tác có xuất hiện không.
   - Chọn 1 vài hợp đồng đối tác và bấm OK, sau đó xác nhận ngày hủy.
   - Tải lại trang và kiểm tra xem cả hợp đồng chính và các hợp đồng đối tác đã chọn có chuyển sang trạng thái "解約済" (CANCELLED) không.
2. Kiểm tra log của backend để đảm bảo API trả về danh sách liên kết chính xác, không bị rò rỉ dữ liệu ngoài luồng.
