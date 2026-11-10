# Báo cáo kiểm tra: <tên thay đổi>

Điền commit, người kiểm tra, ngày, môi trường và liên kết artifact CI. Ghi **đạt / lỗi / không áp dụng + lý do** cho mỗi mục; không đánh dấu đạt khi chưa chạy.

| Hạng mục | Kết quả | Bằng chứng / ghi chú |
| --- | --- | --- |
| Cấu trúc theo hồ sơ và config | Điền | Báo cáo checker |
| Liên kết docs, hướng dẫn setup | Điền | Chạy từ checkout sạch |
| Lint / format / typecheck | Điền | Lệnh và exit code |
| Giới hạn dòng của hàm | Điền | `code.maxFunctionLines` (mặc định 60), lint report, phạm vi và ngoại lệ được review |
| Unit / integration / e2e quan trọng | Điền | Lệnh, test case, dịch vụ phụ trợ |
| Build production | Điền | Artifact / CI |
| Code / dependency / asset thừa | Điền | Công cụ + review entry point động |
| API / validation / auth / error | Điền | Contract / test |
| Threat model / object / role / tenant authorization | Điền | Hồ sơ bảo mật và test các trường hợp bị từ chối |
| Secret / dependency / SAST scan | Điền | Công cụ, phiên bản, commit, findings và ngoại lệ có hạn |
| Abuse protection / resource limits | Điền | Rate/quota/burst, body/timeout/concurrency, limiter nhiều replica và lỗi phụ thuộc |
| Tải mục tiêu / burst / soak / phục hồi | Điền | Offered/achieved load, p95/p99, lỗi/reject, CPU/RAM/pool/queue và ngưỡng đã chốt |
| Origin / proxy / cảnh báo / backup restore | Điền | Cấu hình triển khai, runbook và bằng chứng thử phục hồi |
| UI responsive, keyboard, focus, states | Điền | Thiết bị / công cụ / review |
| 3D bytes / glTF validation | Điền | Dung lượng runtime tree, validator report |
| 3D triangles / draw calls / memory | Điền | Scene đo và phương pháp |
| 3D FPS / frame time / load | Điền | Thiết bị thật, browser, mạng, lần cold/warm |
| Resource cleanup sau chuyển trang | Điền | Đo lặp nhiều lần |
| Docs và ngoại lệ cập nhật | Điền | Quyết định có người duyệt |

## Lỗi còn lại và quyết định phát hành

Mô tả tác động, người xử lý, hạn hoàn tất và điều kiện chặn phát hành. Chỉ ghi chấp nhận ngoại lệ khi đã được người có trách nhiệm duyệt.
