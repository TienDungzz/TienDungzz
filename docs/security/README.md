# Quy chuẩn bảo mật dự án

Áp dụng cho toàn bộ vòng đời dự án: tài liệu, frontend, backend, dữ liệu, dependencies, CI và triển khai. Mục tiêu là xác định rủi ro, đặt kiểm soát và có bằng chứng kiểm chứng; cây thư mục hoặc một lần scan đạt không chứng minh hệ thống an toàn.

## 1. Mức áp dụng và người phụ trách

- **Bắt buộc với mọi dự án:** có người phụ trách bảo mật, kiểm kê dữ liệu và dịch vụ ngoài, quản lý secret, kiểm tra dependencies/source và quy trình xử lý phát hiện.
- **Bắt buộc khi sử dụng:** kiểm soát phiên khi có đăng nhập; quyền đối tượng/tenant khi có dữ liệu riêng; bảo vệ upload, webhook, URL fetch, queue và thanh toán khi có các chức năng này.
- **Backend public:** phải có hồ sơ giới hạn tài nguyên, chống lạm dụng và cách xử lý quá tải. Dịch vụ nội bộ vẫn cần xác định caller và ranh giới tin cậy; mạng riêng không thay cho kiểm tra quyền.
- **Không áp dụng:** ghi lý do, phạm vi và người review trong hồ sơ dự án. Ngoại lệ có biện pháp giảm tác động và ngày xem lại; không để trạng thái bỏ qua vô thời hạn.

Dùng [OWASP ASVS 5.0.0](https://asvs.owasp.org/) làm danh mục tham chiếu để chọn yêu cầu theo rủi ro; ghi phiên bản, mã yêu cầu và phạm vi đã kiểm chứng. Tài liệu này là policy nội bộ bổ sung, không tự tạo chứng nhận tuân thủ ASVS.

## 2. Hồ sơ rủi ro trước triển khai

Điền [mẫu bảo mật](../templates/security.md), tối thiểu gồm:

| Nội dung | Bằng chứng cần có |
| --- | --- |
| Tài sản và dữ liệu | Loại dữ liệu, mức nhạy cảm, nơi lưu, thời gian lưu/xóa và người có quyền |
| Bề mặt truy cập | API, trang quản trị, WebSocket, job, webhook, upload, endpoint cũ và dịch vụ ngoài |
| Ranh giới tin cậy | Client → edge → app → database/provider; danh tính được xác minh ở đâu |
| Nguy cơ chính | Truy cập nhầm tenant, lộ secret, injection, lạm dụng nghiệp vụ, cạn tài nguyên |
| Kiểm soát và chủ sở hữu | Nơi thực thi, test hoặc config thực tế, người duy trì |
| Khả năng phục hồi | Cảnh báo, người nhận, thu hồi quyền/secret, rollback và restore |

Thay đổi auth, dữ liệu nhạy cảm, endpoint public hoặc provider phải cập nhật hồ sơ. Khi thêm API mới, kiểm kê cả phiên bản cũ và quyền truy cập, không chỉ endpoint mới được gọi từ UI.

## 3. Danh tính, phiên và quyền truy cập

- Tách **xác thực danh tính** khỏi **quyết định được phép làm gì**. Mặc định từ chối nếu không có policy cho phép; kiểm tra quyền trên hành động, đối tượng và tenant ở mỗi đường vào, kể cả worker và WebSocket. Không lấy `userId`, `tenantId`, role hoặc giá tiền client gửi làm bằng chứng quyền. Tham khảo [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- Test tối thiểu: chưa đăng nhập, role thiếu quyền, người dùng khác sở hữu tài nguyên, tenant khác, thao tác đọc/ghi/xóa và đường vào nền tương ứng. Với response có nhiều trường, dùng allowlist để không lộ trường nội bộ.
- Dùng identity provider hoặc thư viện xác thực được duy trì; không tự thiết kế mật mã. Nếu lưu mật khẩu, dùng thư viện băm mật khẩu có salt và chi phí được cấu hình, không lưu plaintext hoặc mã hóa có thể giải ngược để so sánh đăng nhập.
- Phiên có TTL, quy tắc gia hạn, đăng xuất/thu hồi và xử lý đổi quyền; tài khoản đặc quyền cần MFA theo hồ sơ rủi ro. Đổi session identifier khi đăng nhập hoặc nâng quyền; không đưa credential vào URL.
- Nếu dùng JWT: phải xác minh chữ ký bằng thuật toán được server cho phép, khóa tin cậy và các claim cần thiết như `iss`, `aud`, `exp`, `nbf`; không chỉ decode payload. Có kế hoạch xoay khóa và thu hồi/giới hạn thời gian sống khi logout hoặc sự cố. Xem [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
- Cookie phiên dùng `Secure`, `HttpOnly`, `SameSite` và phạm vi domain/path phù hợp. Khi cơ chế xác thực dùng cookie tự gửi bởi browser, có biện pháp CSRF tương ứng; `SameSite` và CORS không thay thế toàn bộ thiết kế CSRF. Đối chiếu [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Không đưa secret vào bundle frontend. Việc UI ẩn một nút hoặc frontend chặn một route không phải ranh giới phân quyền backend.

## 4. Dữ liệu đầu vào, browser và tích hợp ngoài

| Điểm kiểm soát | Quy tắc khi có sử dụng |
| --- | --- |
| Validation | Schema runtime cho body, params, query, event và response provider; allowlist trường được cập nhật, giới hạn độ dài/số lượng/độ sâu |
| Database / lệnh hệ thống | Truy vấn có tham số hoặc ORM đúng cách; không nối dữ liệu ngoài vào SQL/lệnh shell; quyền database tối thiểu |
| HTML / UI | Encode theo ngữ cảnh khi render; dùng sanitizer phù hợp khi cho phép rich text; hạn chế API render HTML thô |
| CORS | Chỉ bật origin cần thiết; cấu hình credentials rõ ràng; CORS không chặn client ngoài browser và không thay auth |
| HTTP / browser | TLS cho đường truyền theo trust model; cấu hình security headers theo loại response, CSP cho tài liệu HTML, cache policy cho dữ liệu nhạy cảm |
| Lỗi | Trả mã lỗi và request ID an toàn; không đưa stack trace, SQL, token hay cấu hình nội bộ ra client |
| Webhook | Xác minh chữ ký trên đúng raw body theo provider; kiểm tra thời gian/chống replay và xử lý idempotent; không tin field tự nhận là đã xác minh |

Các cơ chế REST/CORS, trạng thái lỗi và bảo vệ dữ liệu truyền được trình bày trong [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html); chọn header phù hợp ứng dụng thay vì chép một bộ header cho mọi response.

**Khi server tải URL do người dùng cung cấp:** ưu tiên allowlist scheme/host/port, kiểm tra địa chỉ sau phân giải DNS và mỗi redirect, giới hạn thời gian/dung lượng response. Chặn truy cập mạng nội bộ, loopback và metadata cloud nếu không được cấp phép rõ ràng; phối hợp egress policy ở hạ tầng. Chức năng cần truy cập Internet rộng phải ghi thiết kế bảo vệ riêng, không dựa vào regex URL. Tham khảo [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

**Khi nhận file upload:** allowlist loại được phép, kiểm tra nội dung thay vì chỉ tên/MIME client gửi, đổi tên lưu trữ, giới hạn byte/số file/kích thước sau giải nén và thời gian xử lý. Lưu ở nơi không thực thi code, ngoài webroot hoặc object storage có policy phù hợp; quét/xử lý lại theo rủi ro, kiểm tra quyền khi tải xuống. Xem [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## 5. Secret, cấu hình và log

- Secret không nằm trong Git, docs, fixture thật, image hoặc artifact public. `.env.example` chỉ nêu tên và placeholder. Dùng secret store hoặc cơ chế triển khai có kiểm soát truy cập; tách môi trường và tài khoản dịch vụ, cấp quyền tối thiểu.
- Mỗi secret có chủ sở hữu, mục đích, nơi dùng, cách xoay và thu hồi. Kiểm tra đường triển khai sau rotation; khi lộ phải thu hồi tại provider, không chỉ xóa khỏi commit hiện tại. Lịch rotation phụ thuộc loại secret/rủi ro, không áp lịch đổi mật khẩu người dùng máy móc. Theo [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet).
- Không ghi password, session token, API key, cookie hoặc dữ liệu cá nhân đầy đủ vào log. Dùng redaction theo schema/allowlist, làm sạch dữ liệu log do người dùng kiểm soát, đặt thời gian lưu và quyền đọc.
- Audit các sự kiện cần điều tra: đăng nhập/thất bại, thay đổi quyền, quản trị, truy cập dữ liệu nhạy cảm và thay đổi policy. Ghi actor đã xác minh, action, resource an toàn, kết quả và request ID; chống sửa/xóa trái phép theo mức rủi ro.
- Thiếu secret hoặc config bắt buộc phải được phát hiện khi khởi động. Tắt debug, tài khoản mặc định và endpoint quản trị public không cần thiết; cấu hình timeout và giới hạn phải có đơn vị rõ ràng.

## 6. Chống lạm dụng và cạn tài nguyên

Không chọn một con số request/giây chung để coi mọi dự án đã an toàn. Giới hạn phụ thuộc endpoint, chi phí xử lý, tài nguyên và lưu lượng hợp lệ. Khai báo profile và đo theo [backend chịu tải](../backend/reliability.md) và [mẫu năng lực tải](../templates/capacity.md).

| Lớp | Yêu cầu tối thiểu theo phạm vi |
| --- | --- |
| Edge / ingress | Giới hạn kết nối, kích thước và thời gian đọc request; TLS, lọc traffic và chỉ cho phép đường truy cập origin đã thiết kế |
| Ứng dụng | Rate limit theo route và danh tính đáng tin cậy; giới hạn concurrency, body, pagination, batch, upload và thời gian xử lý |
| Database / provider | Pool có giới hạn, query timeout, outbound timeout, quota và giới hạn chi phí |
| Công việc nền | Queue và worker concurrency hữu hạn, retry có giới hạn, chống xử lý trùng, xử lý job lỗi |
| Nghiệp vụ nhạy cảm | Quota riêng cho đăng nhập, OTP/email/SMS, tìm kiếm nặng, export, đặt chỗ và thanh toán |

- IP chỉ là một tín hiệu: người dùng hợp lệ có thể chung NAT, còn lưu lượng lạm dụng có thể đến từ nhiều IP. Kết hợp account/tenant/API key đã xác minh với giới hạn trước xác thực; tránh khóa tài khoản vô thời hạn do thao tác người khác gây ra.
- Sau proxy, chỉ tin forwarded headers từ proxy đã cấu hình và làm sạch header đầu vào. Không dùng IP/tenant header client tự đặt làm khóa tin cậy cho limiter.
- Khi nhiều replica cùng nhận traffic, quota dùng chung cần được thực thi bởi gateway/store có thao tác atomic hoặc cơ chế tương đương. Limiter memory trong từng process không tự tạo giới hạn chung. Ghi quyết định khi store lỗi: từ chối hay fallback, phạm vi ảnh hưởng và cảnh báo.
- WAF, CDN hoặc dịch vụ giảm thiểu DDoS được chọn theo mức public/rủi ro; không bắt mọi app nhỏ tự vận hành Redis hay một bộ WAF. Phải biết origin có bị truy cập trực tiếp để bỏ qua lớp bảo vệ hay không.
- Lưu lượng lớn có thể làm nghẽn mạng trước khi tới app; middleware rate limit không thay thế bảo vệ ở edge/nhà cung cấp. Đối chiếu [OWASP Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).

Quota nghiệp vụ phải kiểm soát cả số thao tác và chi phí thực tế, kể cả khi request đã được xác thực. Gắn cảnh báo ngân sách của provider; CAPTCHA hoặc danh sách chặn đơn lẻ không đủ để chứng minh luồng đã chống tự động hóa.

## 7. Dependencies, CI và kiểm tra bảo mật

Dùng lockfile, runtime/dependency còn được hỗ trợ, nguồn package được phê duyệt và quyền CI tối thiểu. Review thay đổi dependency, script cài đặt và workflow; không cho job từ nguồn không tin cậy đọc secret production. Với artifact phát hành, truy ra commit, phiên bản dependency và báo cáo kiểm tra.

| Gate / hoạt động | Bằng chứng và điều kiện chặn |
| --- | --- |
| Secret scan | Bao phủ source, phần thay đổi và phạm vi lịch sử được chọn; phát hiện secret thật phải xử lý thu hồi và điều tra |
| Dependency / image scan | Ghi phiên bản công cụ, thời điểm cập nhật dữ liệu, phạm vi runtime/dev/image; đánh giá ảnh hưởng và bản sửa |
| Static analysis | Cấu hình phù hợp ngôn ngữ/framework; không dùng lint độ dài hàm như bằng chứng phân tích bảo mật |
| Security tests | Test quyền đối tượng/tenant, validation, session, quota và đường lỗi theo threat model |
| Kiểm tra triển khai | TLS, header, trust proxy, mạng, secret injection, quyền dịch vụ và config runtime thực tế |
| Kiểm thử bổ sung | DAST/pentest theo mức rủi ro và thay đổi; thực hiện trên môi trường/phạm vi đã được phép |

Mặc định nội bộ: chặn secret thật chưa xử lý, test kiểm soát bảo mật thất bại và phát hiện High/Critical có ảnh hưởng chưa khắc phục hoặc chưa có ngoại lệ được người có trách nhiệm duyệt. Mỗi finding cần định danh, mức độ, khả năng ảnh hưởng, chủ sở hữu và hạn xử lý; không tự bỏ findings bằng `|| true`. Lỗi scanner hoặc không tải được dữ liệu phải được ghi là chưa kiểm tra, không phải đạt.

Ngoại lệ nêu finding/version cụ thể, lý do, biện pháp thay thế, người duyệt và ngày hết hạn; review lại khi điều kiện thay đổi. Scanner không chứng minh dependency vô hại; tham khảo quy trình đánh giá và khắc phục của [OWASP Vulnerable Dependency Management](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html).

Gắn lệnh thật vào `quality.required` và `quality.commands` theo [hướng dẫn checker](../quality/README.md). Checker chỉ xác nhận tài liệu/đường dẫn/cấu hình và kết quả command được gọi. Repo tài liệu không có backend đang chạy; muốn kiểm chứng endpoint hoặc hạ tầng phải thực hiện ở dự án đích.

## 8. Phát hiện sự cố và phục hồi

- Xác định người nhận cảnh báo và cách liên hệ nội bộ khi tăng lỗi auth/quota, traffic bất thường, tài nguyên cạn hoặc chi phí provider tăng. Không đưa token hay payload nhạy cảm vào cảnh báo.
- Runbook nêu cách cô lập endpoint, giảm tải, thu hồi secret/phiên, rollback và phục hồi dịch vụ. Thao tác khẩn cấp phải lưu vết và có người chịu trách nhiệm.
- Nếu có dữ liệu cần khôi phục: backup có kiểm soát quyền/mã hóa phù hợp, tách khỏi quyền ghi của ứng dụng, đặt RPO/RTO và lịch thử restore. Backup chỉ được coi là khả dụng sau khi đã kiểm tra phục hồi.
- Khi có sự cố, giữ bằng chứng cần thiết theo quyền và thời gian lưu của dự án, đánh giá dữ liệu bị ảnh hưởng, khắc phục và bổ sung test chống tái diễn. Chính sách thông báo người dùng/các bên liên quan phải được xác định trong hồ sơ vận hành.

## 9. Checklist trước phát hành

- [ ] Hồ sơ threat model, dữ liệu, trust boundaries, người phụ trách và phạm vi không áp dụng đã được review.
- [ ] Test quyền theo actor/action/object/tenant đạt; trường dữ liệu trả ra có allowlist.
- [ ] Session/JWT/secret có TTL hoặc vòng đời rõ ràng và cách thu hồi đã kiểm tra.
- [ ] Các đầu vào và tích hợp đang dùng có validation, timeout, giới hạn tài nguyên và quyền tối thiểu.
- [ ] Endpoint public có profile chống lạm dụng, quota nghiệp vụ và bằng chứng kiểm tra đa replica khi sử dụng.
- [ ] Origin/proxy và lớp bảo vệ edge đúng thiết kế; khả năng chịu tải được đo theo profile dự án.
- [ ] Secret scan, dependency scan, static analysis và security tests có report; finding/ngoại lệ có chủ sở hữu và hạn xử lý.
- [ ] Log/audit/cảnh báo không lộ secret hoặc dữ liệu riêng tư; người trực biết cách xử lý sự cố.
- [ ] Backup/restore và rollback có bằng chứng khi dự án cần; hồ sơ bàn giao không đánh dấu đạt cho phần chưa chạy.

Xem thêm [kiến trúc backend](../backend/README.md), [quy chuẩn chịu tải](../backend/reliability.md) và [mục lục tài liệu](../README.md).
