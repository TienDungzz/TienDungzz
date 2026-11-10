# Hồ sơ năng lực và chống lạm dụng: <tên dịch vụ>

Sao chép thành `docs/capacity.md` ở dự án đích. Điền các ngưỡng theo nghiệp vụ và kết quả đo; đây là mẫu báo cáo, checker không tự đọc các bảng để cấu hình hệ thống. Tham chiếu `docs/backend/reliability.md` và hồ sơ `docs/security-review.md` của dự án.

## 1. Môi trường và phạm vi

| Thuộc tính | Giá trị cần điền |
| --- | --- |
| Build / commit, ngày đo, người phụ trách | Điền |
| Môi trường, domain, service được phép thử | Staging hoặc môi trường đã được duyệt |
| Điều kiện dừng và người có quyền dừng | Ngưỡng lỗi, tài nguyên, ảnh hưởng và kênh liên hệ |
| Phần không thử / không áp dụng | Thành phần và lý do |
| Cấu hình triển khai | Replica, CPU/RAM, runtime, proxy, vùng mạng |
| Dữ liệu thử | Kích thước, phân bố, số tenant/user, dữ liệu giả |
| Công cụ / phiên bản / vị trí generator | Tách khả năng phát tải của generator khỏi khả năng của server |

Chỉ thử trong phạm vi đã được cho phép, có ngân sách và điều kiện dừng. Dùng stub/sandbox cho dịch vụ bên thứ ba; không gửi tải thử tới dịch vụ thật của họ. Tránh email/SMS/thanh toán thật và dữ liệu cá nhân trong bộ tải thử.

## 2. Ngưỡng từng nhóm endpoint

Điền đơn vị rõ ràng. Mỗi dòng là một nhóm có chi phí và quyền tương đương; tách login, OTP, search, upload, export hoặc tác vụ tốn tài nguyên. Không áp dụng cùng một ngưỡng cho mọi API khi chưa có số đo.

| ID / endpoint | Chi phí / nghiệp vụ | Khóa giới hạn | Rate / cửa sổ | Burst / quota nghiệp vụ | Khi vượt |
| --- | --- | --- | --- | --- | --- |
| Điền | CPU / DB / dịch vụ ngoài | IP tin cậy, user, tenant hoặc phối hợp | Request / khoảng thời gian | Số request, công việc hoặc chi phí | Mã lỗi / thời gian thử lại |

| ID | Body / header tối đa | Response / page / batch tối đa | Deadline và timeout phụ thuộc | Request xử lý đồng thời tối đa |
| --- | --- | --- | --- | --- |
| Điền | Byte; số lượng header khi áp dụng | Byte / số phần tử | ms; nhận body, app, DB, dịch vụ ngoài | Theo instance / tenant / toàn hệ thống |

| ID | Pool / chờ DB | Queue / tuổi job tối đa | Worker / retry / DLQ | Cache / TTL / isolation |
| --- | --- | --- | --- | --- |
| Điền | Connection, thời gian chờ | Job / byte / thời gian | Concurrency, số lần, backoff, xử lý lỗi | Key theo quyền/tenant, TTL, invalidation |

Ghi cơ chế chia sẻ quota giữa replica và bảo vệ thao tác cập nhật đồng thời. Ghi proxy được tin cậy và cách không nhận client identity tùy ý từ header. Với WebSocket/GraphQL, thêm giới hạn connection, message/subscription hoặc độ sâu/chi phí truy vấn tương ứng.

## 3. Ngân sách toàn hệ thống

| Tài nguyên / chỉ tiêu | Mục tiêu / giới hạn | Cách cấu hình và đo |
| --- | --- | --- |
| Tải hợp lệ và tải đỉnh | RPS cung cấp / RPS hoàn thành; người dùng đồng thời | Arrival model, request mix và think time |
| Replica API / worker | Min / max, điều kiện scale và thời gian phản ứng | Metric, cooldown, giới hạn provider |
| CPU / RAM / event loop / thread pool | Ngưỡng ổn định và chặn | Giới hạn container/process và telemetry |
| DB connections | Tổng ngân sách, phần dự phòng | Tổng API replica × pool, worker và tác vụ vận hành không vượt ngân sách |
| DB query / lock / transaction | Deadline và ngân sách concurrency | Query plan, timeout, lock wait |
| Cache / limiter | Dung lượng, TTL, cardinality | Chia sẻ giữa replica, eviction và quan sát lỗi |
| Queue / worker | Độ sâu, byte, tuổi job và tốc độ xử lý | Admission, backlog, drain và DLQ |
| Dịch vụ ngoài | Request / ngày, concurrency và chi phí tối đa | Quota, timeout, retry budget và cảnh báo |
| Kết nối và băng thông | Giới hạn tại edge / app / provider | HTTP, WebSocket và response streaming |

## 4. Hành vi khi dependency hoặc hệ thống quá tải

| Kịch bản | Hành vi đã chọn theo endpoint | Ràng buộc và bằng chứng |
| --- | --- | --- |
| Limiter hoặc kho chia sẻ quota lỗi | Từ chối / fallback giới hạn / tiếp tục có kiểm soát | Luồng nào, quota còn lại, không bỏ qua auth |
| Cache lạnh, lỗi hoặc hết hạn đồng loạt | Điền | Chống dồn request cùng key, giới hạn truy vấn nguồn |
| DB chậm hoặc hết pool | Điền | Timeout chờ, admission, không mở connection vô hạn |
| Queue đầy / broker lỗi / worker chết | Điền | Từ chối việc mới, phục hồi, không mất/nhân đôi tác dụng ngoài ý muốn |
| Dịch vụ ngoài chậm hoặc lỗi | Điền | Circuit breaker/fallback khi dùng, backoff+jitter và tổng retry budget |
| Scale up, rollout hoặc shutdown | Điền | Readiness, drain, deadline job/request và số connection tổng |

Với công việc có tác dụng phụ, ghi khóa idempotency, chủ sở hữu, thời hạn, đối chiếu payload, trạng thái kết quả và cách xử lý request đồng thời. Nếu ghi DB rồi enqueue, ghi cách xử lý khoảng lỗi giữa hai thao tác. Đo phục hồi sau khi dependency hoạt động lại; không chỉ xác nhận hệ thống đã trả lỗi.

## 5. Kế hoạch và kết quả thử tải

| Kịch bản | Offered load / arrival model | Thời lượng / dữ liệu / cache | Mục tiêu và điều kiện dừng | Bằng chứng |
| --- | --- | --- | --- | --- |
| Baseline ổn định | Điền | Warm/cold ghi riêng | Điền | Artifact |
| Tăng dần tới giới hạn thiết kế | Điền | Điền | Điền | Artifact |
| Burst | Điền | Điền | Giữ tài nguyên hữu hạn, xử lý quá ngưỡng | Artifact |
| Soak | Điền | Đủ quan sát vòng đời tài nguyên | Leak, tăng backlog, thoái hóa độ trễ | Artifact |
| Dependency lỗi và phục hồi | Điền | Kịch bản mục 4 | Từ chối có kiểm soát và phục hồi | Artifact |

Ghi cả trường hợp route rẻ/nặng, tenant đông/ít, người dùng chưa/đã xác thực và các replica cùng xử lý. Kiểm tra đầu vào vượt giới hạn trong môi trường thử được duyệt, không dùng payload hoặc mục tiêu ngoài phạm vi.

Nếu soak/load test vượt timeout 5 phút mỗi command của checker, chạy bằng job CI riêng có timeout phù hợp và lưu bằng chứng cùng báo cáo; không thay bằng lệnh luôn thành công để ghi nhận gate đã chạy.

| Chỉ số | Ngưỡng chấp nhận | Kết quả và phương pháp |
| --- | --- | --- |
| Offered / achieved / completed RPS, concurrency | Điền | Ghi riêng tải phát, tải nhận, tải hoàn thành và generator bị giới hạn |
| p50 / p95 / p99 latency | ms; nhóm endpoint và trạng thái | Đo cả cold/warm và request bị từ chối |
| Thành công / timeout / hủy / lỗi bất ngờ | Số lượng, tỷ lệ và mẫu số | Bao gồm request chưa hoàn thành khi hết thời gian đo |
| 429 / 503 dự kiến do bảo vệ | Số lượng / tỷ lệ riêng | Không xóa khỏi tổng tải hay gộp thành thành công |
| CPU / memory / event loop / connection pool | Điền | Peak, xu hướng, tài nguyên còn lại |
| Queue depth / age, worker throughput | Điền | Backlog khi tăng tải và thời gian drain |
| Chi phí và request tới dịch vụ ngoài | Điền | Tổng lần gọi thực tế, gồm retry |
| Phục hồi / drain / resource sau soak | Điền | So sánh cùng trạng thái trước/sau, không chỉ snapshot |

## 6. Kết luận và vận hành

| Phát hiện / giới hạn | Tác động | Hành động | Người phụ trách | Hạn / người duyệt |
| --- | --- | --- | --- | --- |
| Điền | Điền | Chỉnh cấu hình / sửa code / ngoại lệ | Vai trò | YYYY-MM-DD |

Ghi ngưỡng thực tế có thể cam kết cho **cấu hình và workload đã đo**, phạm vi chưa kiểm chứng và điều kiện đo lại sau thay đổi. Liên kết dashboard, cảnh báo, runbook quá tải, rollback và lịch sử điều chỉnh quota. Không coi việc có thư mục `cache/`, `queue/` hoặc một lần checker đạt là bằng chứng hệ thống chịu tải đã đạt.
