# Quy chuẩn backend

Backend phải tách rõ giao tiếp, nghiệp vụ và truy cập dữ liệu. Áp dụng các trách nhiệm dưới đây theo tính năng thực tế; chỉ tạo thư mục khi có mã sử dụng. Dự án nhỏ có thể đặt các file cùng module, miễn giữ ranh giới trách nhiệm và khai báo đường dẫn tương ứng trong cấu hình kiểm tra dự án.

Backend public phải có chính sách nhận tải, giới hạn tài nguyên và xử lý quá tải. Xem [bảo mật chung](../security/README.md) và [chịu tải, chống lạm dụng](reliability.md) để chọn thành phần phù hợp, cấu hình ngưỡng và ghi bằng chứng kiểm tra.

## Cấu trúc tham chiếu

Ví dụ cho backend TypeScript có HTTP API, cơ sở dữ liệu và tích hợp thanh toán:

```text
backend/
├── src/
│   ├── app.ts                       # Khởi tạo ứng dụng, đăng ký module/middleware
│   ├── server.ts                    # Lắng nghe kết nối, shutdown
│   ├── config/                      # Đọc và kiểm tra cấu hình môi trường
│   ├── modules/
│   │   └── orders/
│   │       ├── routes/              # HTTP method, URL, chuỗi xử lý
│   │       ├── controllers/         # Chuyển request/response thành dữ liệu nghiệp vụ
│   │       ├── services/            # Use case và quy tắc nghiệp vụ
│   │       ├── repositories/        # Truy vấn và ánh xạ dữ liệu lưu trữ
│   │       ├── validation/          # Schema đầu vào ở ranh giới hệ thống
│   │       ├── types/               # Kiểu, DTO, contract của module
│   │       ├── gateways/            # Tích hợp ngoài thuộc riêng module, nếu có
│   │       └── index.ts             # API công khai của module nếu cần
│   ├── middlewares/                 # Xử lý HTTP dùng chung
│   ├── security/                    # Khi có xác thực, phân quyền hoặc chống lạm dụng
│   │   ├── authentication/
│   │   ├── authorization/
│   │   └── rate-limit/              # Guard/middleware, không chứa thuật toán tự viết tùy tiện
│   ├── policies/                    # Quota, quyền và điều kiện chấp nhận request
│   ├── infrastructure/              # Adapter tới hạ tầng được sử dụng
│   │   ├── cache/
│   │   ├── queue/
│   │   ├── rate-limit/              # Store dùng chung khi quota cần hiệu lực nhiều replica
│   │   └── observability/
│   ├── resilience/                  # Timeout, retry, circuit breaker, concurrency khi cần
│   ├── gateways/                    # Tích hợp ngoài dùng chung, nếu có
│   ├── database/                    # Kết nối, migration, seed khi dùng database
│   ├── jobs/                        # Công việc nền/định kỳ, nếu có
│   ├── workers/                     # Consumer có concurrency và vòng đời riêng, nếu có queue
│   ├── health/                      # Liveness/readiness, không lộ cấu hình nội bộ
│   ├── events/                      # Contract và wiring sự kiện dùng chung, nếu có
│   └── shared/
│       ├── errors/                  # Mã lỗi và ánh xạ lỗi dùng chung
│       ├── helpers/                 # Hàm hỗ trợ có phạm vi, tên rõ ràng
│       └── types/                   # Contract thực sự dùng chung
├── tests/                           # Integration, end-to-end, security và load theo nhu cầu
├── infra/                           # Gateway, network và monitoring nếu quản lý tại repo này
├── .env.example                     # Tên biến và giá trị mẫu không chứa bí mật
└── README.md                        # Cách chạy, test, migration và vận hành
```

Unit test có thể đặt cạnh mã nguồn dưới tên `*.test.ts`/`*.spec.ts`; chọn một quy ước trong dự án. Ví dụ trên là danh mục trách nhiệm, không phải yêu cầu tạo toàn bộ cây thư mục cho mọi ứng dụng.

`security/rate-limit` là điểm thực thi policy tại request; `infrastructure/rate-limit` là adapter tới store/gateway thực sự dùng. Nếu nền tảng quản lý các trách nhiệm này, ghi nơi cấu hình và bằng chứng thay vì thêm thư mục rỗng. `resilience/` có thể chứa các file `timeouts`, `retries`, `circuit-breaker`, `concurrency` hoặc cấu hình thư viện tương đương. Giữ code thuộc riêng feature trong feature đó.

## Thành phần và điều kiện áp dụng

| Thành phần | Khi cần | Trách nhiệm và giới hạn |
| --- | --- | --- |
| Routes | Có HTTP API | Khai báo endpoint, thứ tự middleware, handler. Không truy vấn database. |
| Controllers/handlers | Có đầu vào HTTP hoặc transport khác | Đọc đầu vào đã kiểm tra, gọi use case, ánh xạ kết quả. Không chứa nghiệp vụ hoặc SQL. |
| Services/use cases | Có nghiệp vụ | Điều phối nghiệp vụ, giao dịch và quyền truy cập dữ liệu. Không phụ thuộc trực tiếp `req`/`res`. |
| Repositories | Có lưu trữ và cần tách truy cập dữ liệu | Đóng gói truy vấn, mapping. Không trả HTTP response hoặc quyết định quyền của người dùng. Dự án nhỏ dùng ORM trực tiếp trong service phải ghi rõ lựa chọn. |
| Validation | Có dữ liệu từ client, webhook, queue hoặc bên ngoài | Kiểm tra runtime các body, params, query, header liên quan. Kiểu TypeScript không thay thế kiểm tra runtime. |
| Middlewares | Có xử lý xuyên suốt vòng đời request | Request ID, logging, giới hạn request, xác thực hoặc ánh xạ lỗi theo framework. Dùng tên thư mục `middlewares`, không dùng `middeware`. |
| Gateways/adapters | Gọi dịch vụ ngoài hoặc xử lý realtime | Bọc SDK, HTTP client, provider; quy định timeout và lỗi. Gateway WebSocket theo framework là điểm vào transport, không gộp với client thanh toán. |
| Types/DTOs | Có contract cần dùng chung trong module | Phân biệt đầu vào, dữ liệu nghiệp vụ và đầu ra; không tự động phơi bày model database. |
| Config | Có cấu hình runtime | Đọc biến môi trường tại một nơi; kiểm tra thiếu/sai ngay khi khởi động. |
| Database | Có persistence | Kết nối, migration có phiên bản, seed rõ mục đích. Không sửa schema production thủ công ngoài quy trình. |
| Jobs/events | Có tác vụ nền hoặc bất đồng bộ | Khai báo retry, timeout, xử lý trùng, cơ chế dừng và quan sát lỗi. |
| Helpers | Có logic hỗ trợ cần tái sử dụng | Tên theo công việc như `parse-money`; tránh `common.ts` chứa nghiệp vụ không liên quan. |
| Security/policies | Có tài nguyên được bảo vệ hoặc endpoint có thể bị lạm dụng | Auth, quyền theo object/tenant, quota theo loại thao tác; không thay thế validation nghiệp vụ. |
| Infrastructure | Có cache, queue, limiter store hoặc telemetry ngoài tiến trình | Kết nối và adapter; không trộn cấu hình vendor vào controller. |
| Resilience | Có lời gọi ngoài hoặc tài nguyên cần giới hạn | Deadline, concurrency, retry budget và fallback được cấu hình theo thao tác. |
| Workers | Có việc nền đưa vào queue | Consumer có giới hạn, retry/DLQ, idempotency và drain; `jobs` định nghĩa công việc, worker thực thi. |
| Health/infra | Có môi trường triển khai cần giám sát | Readiness, cấu hình edge/network/monitoring hoặc mapping tới managed service. |

Thành phần thuộc một tính năng nằm trong module của tính năng đó. Chỉ đưa lên phạm vi chung khi có nhiều nơi sử dụng và contract đủ ổn định. Không tạo cả `gateways/` và `adapters/` cho cùng một trách nhiệm nếu chưa có lý do được ghi lại.

## Ánh xạ theo framework

Quy chuẩn áp dụng cho trách nhiệm, còn tên file và cơ chế đăng ký tuân theo framework. Khai báo mapping trong cấu hình kiểm tra thay vì đổi tên thư mục bắt buộc của framework.

| Khái niệm | Express | NestJS | Python với FastAPI |
| --- | --- | --- | --- |
| Module/tính năng | `modules/orders/` và router được mount | `orders.module.ts`, controller và provider của feature | Package `orders/`, khai báo router và dependency |
| Route/controller | `Router` và hàm handler | Decorator trên controller; không cần `routes/` riêng | `APIRouter` và path operation; không cần `controllers/` riêng |
| Service | Hàm/class nghiệp vụ do ứng dụng wiring | Provider được inject qua module | Hàm/class được cấp qua dependency hoặc wiring rõ ràng |
| Validation | Schema runtime tại ranh giới request | DTO và pipe validation được cấu hình | Request model/schema và validation bổ sung theo nghiệp vụ |
| Xử lý xuyên suốt | Middleware và error handler | Middleware, guards, pipes, interceptors, exception filters theo đúng vai trò | Middleware và dependencies theo đúng vai trò |

Express cung cấp router và handler; cách phân lớp trong tài liệu này là quy ước của bộ chuẩn. NestJS tổ chức controller/provider trong feature module. FastAPI hỗ trợ chia ứng dụng bằng package và `APIRouter`. Tham khảo tài liệu chính thức: [Express routing](https://expressjs.com/en/guide/routing/), [NestJS modules](https://docs.nestjs.com/modules), [FastAPI bigger applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/).

## Luồng xử lý và ranh giới phụ thuộc

Luồng HTTP tham chiếu:

```text
request
  → edge / gateway: lọc sớm, giới hạn kết nối và kích thước
  → request ID / admission control / rate limit thô
  → route + xác thực + quota theo tài khoản/tenant
  → validation đầu vào
  → controller
  → service (kiểm tra quyền với tài nguyên và nghiệp vụ)
  → repository / cache / gateway hoặc queue có giới hạn
  → ánh xạ response hoặc lỗi tập trung
```

Thứ tự cụ thể theo vòng đời framework; webhook kiểm tra chữ ký có thể cần raw body trước bước parse JSON. Ghi lại ngoại lệ trong tài liệu API.

- Controller chỉ gọi service hoặc API công khai của module. Service không import controller, router hoặc kiểu request của HTTP framework.
- Repository và gateway không import controller. Không để SQL hoặc provider SDK lan vào route.
- Module khác gọi API công khai đã khai báo; tránh import sâu file nội bộ hoặc tạo phụ thuộc vòng.
- Ranh giới transaction nằm tại use case cần tính nguyên tử. Không giữ transaction database mở trong lúc chờ dịch vụ mạng nếu chưa có thiết kế rõ ràng.
- Không tin ID/role/giá trị tiền do client gửi. Kiểm tra quyền trên tài nguyên trong service ngay cả khi endpoint đã xác thực.
- Tác vụ nền và WebSocket cũng đi qua validation, kiểm tra quyền và service tương ứng; không sao chép nghiệp vụ của HTTP.

## Contract API, lỗi và dữ liệu

- Mỗi endpoint có method, path, quyền, schema đầu vào/đầu ra, mã trạng thái, phân trang và ví dụ lỗi. Cập nhật OpenAPI hoặc tài liệu contract cùng thay đổi mã.
- Chọn một định dạng lỗi cho dự án, ví dụ `code`, `message`, `requestId`, `details` an toàn. Không trả stack trace, SQL, khóa bí mật hoặc thông tin nội bộ cho client.
- Ánh xạ lỗi xác thực, thiếu quyền, validation, không tìm thấy, xung đột và lỗi nội bộ nhất quán. Quy định rõ `400`/`422` theo framework và contract của dự án.
- Giới hạn phân trang, kích thước upload, độ dài trường và số lượng phần tử theo use case. Không cho phép truy vấn/tải dữ liệu không giới hạn.
- Đầu ra dùng allowlist trường; loại mật khẩu, token và dữ liệu riêng tư. Quy định múi giờ, định dạng thời gian, đơn vị tiền và độ chính xác số.
- Migration phải chạy được theo thứ tự đã ghi. Thay đổi làm mất dữ liệu cần kế hoạch sao lưu, chuyển đổi và khôi phục được duyệt riêng cho dự án.

## Cấu hình, bảo mật và vận hành

Các yêu cầu sau là tiêu chí review của dự án; checker cấu trúc không chứng minh ứng dụng đã an toàn:

- Không commit bí mật; `.env.example` chỉ chứa placeholder. Không ghi token, cookie, mật khẩu hoặc payload nhạy cảm vào log.
- Xác thực danh tính và kiểm tra quyền là hai trách nhiệm riêng. Có test truy cập tài nguyên của người khác và các vai trò bị từ chối.
- Dùng truy vấn có tham số hoặc ORM đúng cách. Không nối trực tiếp dữ liệu đầu vào vào SQL hoặc lệnh shell.
- Cấu hình CORS theo nguồn thực tế; áp dụng chống CSRF khi cơ chế xác thực và mô hình triển khai yêu cầu. Có giới hạn request cho endpoint dễ bị lạm dụng.
- Mỗi lời gọi dịch vụ ngoài có timeout; retry có giới hạn và chỉ dùng khi an toàn. Thanh toán, webhook và job có khả năng gửi lại cần thiết kế idempotency.
- Có health/readiness phù hợp môi trường; shutdown dừng nhận việc mới và đóng tài nguyên. Log có request/job ID, tên sự kiện, thời gian xử lý và lỗi đã che dữ liệu nhạy cảm.
- Tài liệu vận hành ghi rõ cách chạy migration, thiết lập biến môi trường, triển khai, kiểm tra sau triển khai và rollback.

## Chịu tải và chống lạm dụng

- Có profile theo route: giới hạn body/header, deadline, quota, concurrency, pagination và hành vi khi dependency lỗi. Không dùng một con số request/giây cho mọi endpoint.
- Khi nhiều replica dùng chung một quota, counter phải cập nhật nguyên tử trong store dùng chung hoặc gateway phù hợp; bộ đếm trong RAM từng process không phải quota toàn hệ thống.
- Giới hạn đồng thời và queue; khi đầy phải từ chối có kiểm soát thay vì tiếp tục giữ request trong RAM. Pool database và tổng số replica phải nằm trong ngân sách kết nối đã đo.
- Tách xử lý nặng khỏi request bằng worker khi phù hợp; việc được chấp nhận phải có trạng thái, idempotency, retry hữu hạn và cách phục hồi.
- Chỉ tin forwarding headers từ proxy đã cấu hình; phân biệt quota theo IP với quyền và quota theo user/tenant. Limiter ứng dụng không đủ để bảo vệ băng thông khi bị DDoS.
- Có test tải bình thường, burst, chạy lâu, dependency chậm và limiter/cache lỗi; lưu latency, error, saturation và thời gian phục hồi. Chi tiết cùng tiêu chí nghiệm thu nằm ở [quy chuẩn chịu tải](reliability.md).

## Kiểm tra tự động và mã thừa

Mỗi function, controller handler, service method, middleware, validator, callback hoặc gateway method mặc định tối đa **60 dòng**, theo `code.maxFunctionLines`. Đếm cả dòng khai báo/kết thúc, dòng trống và comment. Tách từng bước theo trách nhiệm thực tế và dùng lại xử lý chung; không dồn câu lệnh hoặc tạo hàm giả để đạt lint. Giới hạn có thể điều chỉnh theo [quy tắc kiểm tra chung](../quality/README.md#giới-hạn-dòng-của-hàm), dùng công cụ hiểu đúng ngôn ngữ của backend.

Khai báo backend thành một scope trong `structure[]`: `root` trỏ tới backend; mỗi phần tử `components` có `name`, `paths` và `required`. `paths` là danh sách đường dẫn thay thế cụ thể tính từ `root`, có thể trỏ tới thư mục hoặc file; không dùng glob. Ví dụ NestJS có thể ánh xạ controller tới `src/modules/orders/orders.controller.ts` thay vì tạo thư mục `controllers/` rỗng. Checker yêu cầu có nội dung triển khai; chỉ `README.md` hoặc `.gitkeep` không đáp ứng yêu cầu. Scope không áp dụng đặt `enabled: false` kèm `reason`.

Khai báo các bước cần chạy trong `quality.required` và lệnh thật trong `quality.commands`. Chỉ khi dùng cờ `--run`, checker mới thực thi những lệnh này; kiểm tra cấu trúc đơn thuần chưa phải kiểm tra chất lượng backend. CI phải chạy chế độ `--run` và thất bại khi một bước bắt buộc trả exit code khác `0`.

| Nhóm kiểm tra | Bằng chứng yêu cầu |
| --- | --- |
| Cấu trúc | Các thành phần được bật trong cấu hình có đường dẫn tồn tại, đúng phạm vi backend. |
| Lint và format | Lệnh của dự án bắt được lỗi quy tắc, import/biến không dùng theo cấu hình đã chọn. |
| Typecheck | Compiler hoặc type checker chạy trên mã ứng dụng và contract. Với JS không dùng static typing, ghi rõ cách kiểm tra thay thế. |
| Dead code/dependency | Công cụ đã cấu hình entry point phát hiện export, file, dependency không dùng; rà soát cả đăng ký động, reflection và code sinh. |
| Test | Unit test nghiệp vụ; integration test database/API; case đầu vào sai, thiếu quyền, xung đột, lỗi provider và xử lý trùng khi áp dụng. |
| Build | Biên dịch/đóng gói production bằng cấu hình triển khai thực tế. Với backend thông dịch, khai báo bước kiểm tra/import hoặc đóng gói phù hợp. |
| Security | Kiểm tra quyền âm tính, tenant isolation, đầu vào, secrets/dependency/SAST và policy theo [bảo mật chung](../security/README.md). |
| Load/resilience | Profile có threshold, kết quả tải và tình huống dependency lỗi theo [chịu tải](reliability.md); không chỉ có lệnh gửi request. |

Ví dụ Node.js có thể dùng các script `lint`, `typecheck`, `test`, `build` đã cài trong `package.json`; backend Python khai báo lệnh lint, typecheck, test, packaging tương ứng của dự án. Đây là tên trách nhiệm, không phải yêu cầu mọi ngôn ngữ có cùng tên script hoặc cùng công cụ.

Lint, typecheck và build riêng lẻ không chứng minh toàn bộ mã thừa đã bị loại. Cần cấu hình công cụ phân tích phạm vi sử dụng và review. Không xóa handler được framework nạp động chỉ vì công cụ báo không có import tĩnh.

## Checklist hoàn thành

- [ ] Mỗi tính năng có nơi sở hữu; thành phần đang dùng có đường dẫn được khai báo, thành phần không dùng có lý do bỏ qua.
- [ ] Route/controller không chứa truy vấn hoặc nghiệp vụ; service không phụ thuộc HTTP framework; không có import vòng đã biết.
- [ ] Tất cả đầu vào bên ngoài có runtime validation; quyền tài nguyên được kiểm tra trong luồng nghiệp vụ.
- [ ] API contract và định dạng lỗi khớp hành vi; đầu ra không lộ dữ liệu riêng tư.
- [ ] Migration, timeout, idempotency và shutdown được mô tả và kiểm chứng khi có sử dụng.
- [ ] Có quota/admission/deadline và giới hạn tài nguyên tại các lớp đang dùng; cấu hình nhiều replica được kiểm chứng.
- [ ] Có bằng chứng security/load phù hợp profile; đã thử phục hồi và biết ai xử lý cảnh báo/quá tải.
- [ ] Lint, typecheck, phân tích mã thừa, test và bước build/đóng gói áp dụng đã chạy thành công; ngoại lệ có chủ sở hữu và lý do.
- [ ] Hướng dẫn chạy, biến môi trường, dữ liệu mẫu và vận hành đủ để thành viên khác tái hiện.

Quay lại [mục lục tài liệu](../README.md).
