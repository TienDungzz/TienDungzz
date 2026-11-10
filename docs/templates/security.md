# Hồ sơ bảo mật: <tên dự án>

Sao chép thành `docs/security-review.md` ở dự án đích. Điền dữ liệu thật trước bàn giao; từng mục có kết quả **đạt / lỗi / không áp dụng + lý do**. Tham chiếu quy chuẩn tại `docs/security/README.md` và `docs/backend/reliability.md` của dự án.

Không ghi secret, token đang hoạt động, payload chứa dữ liệu cá nhân hoặc chi tiết truy cập vận hành trong báo cáo. Dùng mã tham chiếu tới kho bằng chứng có phân quyền.

## 1. Phạm vi và trách nhiệm

| Thuộc tính | Giá trị cần điền |
| --- | --- |
| Build / commit, ngày đánh giá | Điền |
| Môi trường và phạm vi được đánh giá | Domain, service, API, worker, kho dữ liệu |
| Chủ sở hữu bảo mật / vận hành | Vai trò và kênh liên hệ nội bộ |
| Người đánh giá / người duyệt | Điền |
| Chính sách và phiên bản tham chiếu | Quy chuẩn nội bộ, tiêu chí áp dụng |
| Phạm vi không áp dụng | Thành phần và lý do |

## 2. Tài sản và ranh giới tin cậy

| Tài sản / dữ liệu | Phân loại | Nơi lưu và luồng truyền | Ai được truy cập | Lưu giữ / xóa |
| --- | --- | --- | --- | --- |
| Điền | Công khai / nội bộ / nhạy cảm | Điền | Vai trò / tenant | Thời hạn và cơ chế |

Liệt kê mọi đường vào: web/API, admin, upload, webhook, queue, WebSocket, tác vụ định kỳ và dependency ngoài. Gắn sơ đồ thực tế có browser, edge/proxy, app, database, cache/queue và dịch vụ ngoài; đánh dấu nơi đổi mức tin cậy. Ghi trường hợp origin có thể bị truy cập trực tiếp và biện pháp kiểm soát.

| Mối đe dọa / hành vi lạm dụng | Tài sản bị ảnh hưởng | Biện pháp | Bằng chứng kiểm tra | Rủi ro còn lại |
| --- | --- | --- | --- | --- |
| Điền | Điền | Chủ sở hữu và vị trí cấu hình | Test / report | Quyết định và người duyệt |

## 3. Danh tính, quyền và dữ liệu

| Kiểm soát | Cấu hình / phạm vi | Bằng chứng và kết quả |
| --- | --- | --- |
| Đăng nhập, phục hồi, MFA khi áp dụng | Provider, luồng và tài khoản đặc quyền | Kiểm tra luồng hợp lệ và bị từ chối |
| Session / token | Hết hạn, thu hồi, rotation, thuộc tính cookie; kiểm tra JWT khi dùng | Test hết hạn, token sai, logout và thay đổi quyền |
| Quyền chức năng và tài nguyên | Vai trò, chủ sở hữu, tenant; mặc định từ chối | Test ngang người dùng, ngang tenant và khác vai trò |
| Validation / đầu ra | Body, params, query, header, DTO allowlist | Đầu vào sai, trường không cho phép và dữ liệu riêng tư |
| Secret và quyền dịch vụ | Nơi cấp/lưu, quyền tối thiểu, lịch và người rotate | Bằng chứng rotation; không lưu giá trị secret |
| Log / audit trail | Sự kiện cần lưu, che dữ liệu, phân quyền, retention | Kiểm tra không lộ token/PII, có truy vết được hành động |

Ghi ma trận endpoint hoặc use case cụ thể; không chỉ ghi “đã có auth”. Với mỗi nhóm quyền, có test cho chủ thể được phép và ít nhất các trường hợp truy cập tài nguyên không thuộc quyền của mình.

## 4. Kiểm soát tại ranh giới hệ thống

| Hạng mục | Có dùng? | Vị trí cấu hình / bằng chứng |
| --- | --- | --- |
| TLS, security headers, CSP | Điền | Môi trường áp dụng, kiểm tra response thực tế |
| CORS và CSRF | Điền | Origin được phép, cách xác thực và test bị từ chối |
| SQL / command injection và XSS | Điền | Tham số hóa, encode theo ngữ cảnh, xử lý nội dung HTML |
| SSRF / egress | Điền | Nguồn URL, đích được phép, redirect và quyền truy cập mạng |
| Upload / download | Điền | Loại file, dung lượng, lưu trữ cách ly và quyền đọc |
| Webhook | Điền | Chữ ký, raw body, cửa sổ thời gian và chống xử lý trùng |
| Proxy / client identity | Điền | Proxy được tin cậy, header bị loại/ghi lại, origin access |
| Rate limit / quota / chống brute force | Điền | IP, user/tenant, route, cửa sổ, burst và các replica |
| Chống lạm dụng OTP, email, thanh toán | Điền | Giới hạn tần suất, tổng chi phí, cảnh báo và cách khôi phục |
| Timeout, concurrency, queue và giới hạn dữ liệu | Điền | Tham chiếu hồ sơ năng lực và test quá giới hạn |
| Edge / WAF / bảo vệ DDoS khi áp dụng | Điền | Provider, phạm vi bảo vệ, giới hạn và kiểm soát origin |

Đối với limiter/cache/queue hoặc dịch vụ xác thực gặp lỗi, ghi rõ hành vi từng luồng: từ chối có kiểm soát, fallback có giới hạn hay tiếp tục phục vụ. Không để lỗi dependency vô tình bỏ qua kiểm tra quyền hoặc tạo xử lý không giới hạn. Dùng [mẫu năng lực](capacity.md) để mô tả ngưỡng và bằng chứng.

## 5. Quality gates và phát hiện

| Gate / phạm vi | Công cụ, phiên bản, lệnh CI | Chính sách chặn | Bằng chứng / kết quả |
| --- | --- | --- | --- |
| Dependency / image / IaC nếu có | Điền | Mức độ, khả năng ảnh hưởng và quy trình xử lý | Artifact |
| Secret scanning | Working tree, lịch sử hoặc artifact trong phạm vi | Loại phát hiện cần xử lý / rotate | Artifact đã che giá trị |
| Static analysis và test bảo mật | Source và framework được bao phủ | Rule và test bắt buộc | Artifact |
| Dynamic checks khi áp dụng | Môi trường được cho phép | Tiêu chí và giới hạn kiểm tra | Artifact |

Ghi các phần công cụ không bao phủ và người review thủ công. Baseline không tự hợp thức hóa phát hiện cũ; từng rủi ro chưa xử lý phải có quyết định có thời hạn. Không ghi đạt khi gate chưa chạy hoặc chỉ kiểm tra một package trong nhiều package được phát hành.

| Phát hiện | Mức độ / tác động | Cách xử lý hoặc giảm tác động | Người phụ trách | Hạn / ngoại lệ hết hạn | Người duyệt |
| --- | --- | --- | --- | --- | --- |
| Mã tham chiếu | Điền | Bản sửa / biện pháp | Vai trò | YYYY-MM-DD | Điền |

## 6. Ứng phó và phục hồi

| Tình huống | Phát hiện / cảnh báo | Người và kênh xử lý | Cô lập / giảm tác động | Phục hồi và xác nhận |
| --- | --- | --- | --- | --- |
| Lộ secret / truy cập trái phép | Điền | Vai trò trực | Thu hồi/rotate, giới hạn truy cập, giữ audit | Kiểm tra quyền và ảnh hưởng |
| Request bất thường / quá tải | Điền | Vai trò trực và provider | Điều chỉnh admission/edge theo runbook | Kiểm tra traffic hợp lệ, queue và dependency |
| Mất / hỏng dữ liệu | Điền | Vai trò dữ liệu | Khoanh vùng thay đổi, bảo toàn bằng chứng | Restore và kiểm tra nhất quán |

Ghi nơi giữ runbook, quyền thao tác, người quyết định thông báo và thời điểm xem lại. Lưu timeline sự cố cùng bằng chứng đã che dữ liệu nhạy cảm.

- Backup: loại dữ liệu, lịch, retention, mã hóa, người có quyền và vị trí độc lập phù hợp rủi ro.
- Mục tiêu khôi phục: RPO `<mất dữ liệu tối đa chấp nhận>`; RTO `<thời gian phục hồi tối đa>`.
- Lần restore thử gần nhất: `<ngày, môi trường, thời gian thực tế, dữ liệu được đối soát, kết quả>`.
- Điều kiện nghiệm thu: `<các lỗi phải sửa, ngoại lệ được duyệt, người chịu trách nhiệm và ngày đánh giá lại>`.

Checker xác nhận tài liệu và lệnh đã khai báo; hồ sơ này cần bằng chứng từ cấu hình, test và vận hành thực tế để kết luận.
