# Backend chịu tải và chống lạm dụng

Áp dụng cho backend nhận request, message hoặc kết nối dài. Mục tiêu là bảo vệ tài nguyên, giữ luồng quan trọng hoạt động và phục hồi có kiểm soát khi tải tăng hoặc dependency lỗi. Không có cấu trúc thư mục hoặc ngưỡng request nào tự bảo đảm hệ thống chịu được mọi mức tải.

## 1. Phạm vi bắt buộc và có điều kiện

- **Backend public:** phải mô tả đường đi request, giới hạn đầu vào, deadline, quota chống lạm dụng, giới hạn đồng thời và hành vi quá tải.
- **Dữ liệu riêng hoặc nhiều tenant:** phải có quyền trên tài nguyên, cách ly cache/job và quota phù hợp, theo [quy chuẩn bảo mật](../security/README.md).
- **Nhiều replica:** phải xác định policy nào toàn hệ thống, policy nào mỗi instance; kiểm chứng counter dùng chung và tổng tài nguyên.
- **Queue, cache, circuit breaker, autoscaling:** dùng khi nhu cầu và số đo phù hợp. Không bắt dự án nhỏ cài đủ mọi dịch vụ hoặc tạo thư mục rỗng.
- **Mọi dự án:** ghi thiết bị/hạ tầng, profile, ngưỡng và bằng chứng trong [hồ sơ capacity](../templates/capacity.md); phần không áp dụng cần lý do.

## 2. Cấu trúc và trách nhiệm

Mở rộng [cấu trúc backend](README.md) theo các thành phần thực sự dùng:

```text
backend/
├── src/
│   ├── security/
│   │   ├── authentication/        # Xác thực danh tính
│   │   ├── authorization/         # Quyền theo tài nguyên/tenant
│   │   └── rate-limit/            # Thực thi policy trên request/message
│   ├── policies/                  # Route class, quota, admission, failure policy
│   ├── infrastructure/
│   │   ├── rate-limit/            # Adapter store/gateway
│   │   ├── cache/                 # Cache client và phạm vi key
│   │   ├── queue/                 # Producer, broker adapter, outbox nếu cần
│   │   └── observability/         # Metrics, tracing, log đã che dữ liệu
│   ├── resilience/
│   │   ├── timeouts/              # Deadline và cancellation
│   │   ├── retries/               # Retry budget, backoff, jitter
│   │   ├── circuit-breaker/       # Chỉ khi failure mode cần tới
│   │   └── concurrency/           # Bulkhead, semaphore, admission
│   ├── workers/                   # Consumer có concurrency và lifecycle
│   └── health/                    # Liveness/readiness
├── tests/
│   ├── security/                  # Negative authorization, quota và abuse cases
│   └── load/                      # Profile/threshold và test resilience
└── infra/
    ├── gateway/                   # Hoặc mapping tới edge managed service
    └── monitoring/                # Alert/dashboard/runbook được quản lý ở đây
```

Không tạo cả folder lẫn một lớp wrapper khi framework đã có guard, interceptor hoặc adapter tương đương. Mỗi trách nhiệm có một nơi sở hữu; cấu hình gateway do nhóm hạ tầng quản lý thì ghi nguồn và phiên bản trong hồ sơ. Checker chỉ xác nhận đường dẫn được khai báo có nội dung, không kiểm chứng hiệu lực của policy.

## 3. Các lớp bảo vệ request

```text
client
  → edge/CDN hoặc dịch vụ bảo vệ DDoS, nếu profile yêu cầu
  → gateway/load balancer: TLS, kết nối, header/body, lọc và rate limit thô
  → app: request ID, admission, giới hạn trước thao tác đắt
  → authentication → quota theo user/tenant và loại endpoint
  → validation → controller/service + authorization theo tài nguyên
  → bounded pool/cache/database/gateway hoặc bounded queue → worker
```

Chỉ công khai origin qua đường đã thiết kế; nếu dùng edge bảo vệ, giới hạn truy cập origin để tránh đường vòng. Chặn lưu lượng quá lớn cần biện pháp từ mạng/nhà cung cấp trước khi bão hòa đường truyền. Tham khảo cách phân lớp trong [OWASP Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).

Proxy cuối phải ghi lại hoặc loại forwarding headers do client gửi. Chỉ tin proxy/IP subnet đã xác định, kiểm tra mọi đường vào app; không bật tin mọi proxy vì muốn lấy IP người dùng. Xem [Express behind proxies](https://expressjs.com/en/guide/behind-proxies/).

## 4. Rate limit, quota và chống lạm dụng

Policy phải khai báo **khóa đếm, thuật toán/thư viện, phạm vi, cửa sổ, burst, TTL và hành vi khi store lỗi**. Giới hạn theo loại route, user/tenant và IP ở lớp phù hợp; IP không đại diện duy nhất cho một người do NAT/proxy. Khóa trước xác thực phải có kích thước hữu hạn và TTL để không giữ vô hạn dữ liệu do client tạo.

- Counter toàn hệ thống phải dùng store hỗ trợ cập nhật nguyên tử hoặc gateway có cùng phạm vi. Hai process dùng limiter trong RAM riêng không chia sẻ quota.
- Nếu gateway có nhiều node, xác minh counter có đồng bộ theo thiết kế sản phẩm; shared memory trong một node không tự đồng nghĩa quota toàn cụm.
- Tách login, OTP, reset password, email/SMS, tìm kiếm, export và API tốn phí khỏi quota đọc thông thường. Giới hạn cả chi phí/ngày hoặc số công việc, không chỉ request/giây.
- Không hard-lock tài khoản chỉ từ request sai của người lạ. Dùng backoff/challenge và quy trình phục hồi phù hợp, kết hợp tín hiệu tài khoản và mạng để hạn chế khóa nhầm người hợp lệ.
- Quota theo tenant phải tránh một khách hàng chiếm hết pool hoặc queue. Endpoint nội bộ và webhook cũng có policy; bypass cần danh tính đã xác minh và giới hạn riêng.
- Không lấy CAPTCHA, IP allowlist hoặc WAF làm bằng chứng thay thế authorization trên tài nguyên.

Chọn mã lỗi có chủ đích: `429` khi bên gọi vượt quota của policy; có thể gửi `Retry-After` nếu biết thời gian chờ hợp lý. `503` dùng cho tình trạng dịch vụ tạm không nhận thêm việc. Contract nêu client được retry thế nào. Xem [RFC 6585 về 429](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) và [RFC 9110 về 503](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.4).

Một gateway có thể mặc định trả mã khác lựa chọn của API; phải cấu hình và test thực tế. Ví dụ NGINX có `limit_req_status`, burst và dry-run riêng, xem [ngx_http_limit_req_module](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html). Ghi policy fail-open/fail-closed theo endpoint: thao tác nhạy cảm/tốn phí không được âm thầm bỏ quota; luồng đọc ít rủi ro có thể giảm chất lượng với giới hạn cục bộ hữu hạn khi được chấp nhận. Cả hai nhánh phải có cảnh báo và test.

## 5. Deadline, concurrency và bảo vệ tài nguyên

Trước phát hành phải có giới hạn hoặc lý do không áp dụng cho các mục sau:

| Vùng tài nguyên | Policy cần chốt |
| --- | --- |
| Kết nối và đầu vào | Số kết nối, header bytes/count, thời gian nhận header/body, body/upload bytes, dữ liệu sau giải nén |
| Request | Deadline tổng, số request đang xử lý, số request chờ và thời gian chờ tối đa |
| Database | Pool size, pool wait timeout, query/transaction deadline, pagination và row limit |
| HTTP outbound | Connect/read/total timeout, pool/socket limit, retry budget |
| CPU/RAM | Việc CPU nặng, giải mã/regex/query phức tạp có giới hạn, worker concurrency và giới hạn payload |
| Queue | Depth, oldest age, job bytes, enqueue wait, job deadline, retry/DLQ và lưu trữ |
| Response | Số item/bytes, streaming có backpressure, client chậm và cancellation |

Đặt deadline theo ngân sách đầu-cuối và thời gian còn lại; đừng để mỗi tầng chờ đủ toàn bộ deadline rồi cộng dồn. Timeout HTTP không tự bảo đảm query hay tác vụ nền đã dừng: truyền cancellation khi client/timeout hủy và kiểm tra driver thực sự giải phóng công việc. Với Node, phân biệt các timeout nhận request/header và timeout socket thay vì coi một thuộc tính bao phủ tất cả; xem [Node.js HTTP](https://nodejs.org/api/http.html).

Khi đủ concurrency hoặc hết thời gian chờ, từ chối sớm có kiểm soát; không tạo promise/task/queue trong RAM vô hạn. Tách ngân sách cho thao tác nặng và luồng quan trọng bằng bulkhead khi cần. Health endpoint nhỏ, có giới hạn và không bị luồng công việc dài chiếm hết tài nguyên.

Pool database phải tính **tổng số process/replica/worker tối đa × pool mỗi process**, cộng kết nối vận hành và dịch vụ khác, trong ngân sách database. Autoscaling API/worker phải có trần phù hợp; tăng replica không tự sửa database đang bão hòa. Đo pool wait, connection count và query chậm trước khi tăng pool.

## 6. Cache, queue và xử lý nền

### Cache

- Quy định TTL, kích thước, eviction và cơ chế invalidation theo nghiệp vụ; cache không phải nguồn dữ liệu có thẩm quyền cho quyết định bảo mật cần nhất quán.
- Key chứa phạm vi tenant/user và phiên bản cần thiết, được tạo từ dữ liệu đã chuẩn hóa. Không cache chung response riêng tư hoặc dữ liệu quyền của người khác.
- Cache miss đồng thời cần coalescing/lock có timeout hoặc chiến lược phù hợp để tránh cùng tải lại dữ liệu. Đừng biến cache lỗi thành toàn bộ request cùng đổ xuống database không giới hạn.
- Chốt dữ liệu nào được dùng bản cũ khi lỗi, dữ liệu nào phải báo lỗi; test invalidation, quyền thay đổi, TTL và cache outage.

### Queue và worker

- Chỉ trả trạng thái chấp nhận công việc khi đã ghi nhận bền vững theo contract; trả job ID và cách xem trạng thái/kết quả khi phù hợp.
- Có giới hạn enqueue, depth, thời gian chờ và concurrency worker; đầy thì phản hồi theo contract thay vì mất job âm thầm.
- Consumer phải chịu được giao lại: idempotency key gắn owner/tenant và payload hash, lưu trạng thái/kết quả theo thời hạn phù hợp; cùng key khác payload phải được xử lý theo contract.
- Claim key và bản ghi nghiệp vụ phải dùng uniqueness/transaction hoặc thao tác nguyên tử phù hợp, có test hai request đồng thời và crash giữa các bước. Kiểm tra idempotency bằng một lần đọc rồi ghi tách rời không đủ ngăn xử lý trùng.
- Nếu ghi database và enqueue cần nhất quán, thiết kế transaction/outbox hoặc cơ chế tương đương; một lần gọi enqueue không tự bảo đảm nghiệp vụ chỉ chạy một lần.
- Retry hữu hạn, job deadline và dead-letter queue; DLQ có cảnh báo, người xử lý và quy trình replay kiểm tra lại idempotency/quyền, không chỉ nơi lưu lỗi mãi mãi.

## 7. Dependency chậm, retry và phục hồi

Retry chỉ dành cho lỗi tạm thời và thao tác an toàn hoặc được bảo vệ bằng idempotency. Chốt một tầng chịu trách nhiệm, giới hạn số lần/tổng thời gian, dùng backoff và jitter khi phù hợp; tính cả retry của SDK và proxy để tránh nhân tải. Không retry mọi lỗi validation/quyền. Tham khảo [AWS Well-Architected về giới hạn retry](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html).

Circuit breaker có ngưỡng mở, thời gian nghỉ, probe nửa mở và metric; fallback không được đổi quyền hoặc trả kết quả thanh toán giả. Khi dependency hỏng, ưu tiên trả lỗi hữu hạn và giữ tài nguyên cho luồng còn hoạt động. Circuit breaker không thay thế timeout, concurrency hoặc sửa lỗi dependency.

Khi shutdown: ngừng nhận việc mới, đánh dấu readiness phù hợp, drain trong deadline, dừng consumer và đóng pool/connection. Job chưa hoàn tất phải được broker giao lại hoặc phục hồi theo contract. Có test kill/restart giữa bước xử lý và test rollout nhiều replica; liveness không nên khởi động lại hàng loạt chỉ vì dependency chung tạm lỗi.

## 8. WebSocket, GraphQL và luồng đặc biệt

Áp dụng khi có sử dụng, ghi không áp dụng nếu không có:

| Luồng | Giới hạn bổ sung |
| --- | --- |
| WebSocket/SSE | Kết nối theo user/tenant/IP, thời gian rỗi, heartbeat, message bytes/rate, subscription, outbound buffer và thu hồi quyền |
| GraphQL/batch | Depth/cost, số operation/alias/batch, pagination, timeout; authorization và quota theo công việc thực tế |
| Upload/export | Bytes sau giải nén, số file, thời gian xử lý, dung lượng lưu, quyền tải kết quả và cleanup |
| Webhook/tác vụ tốn phí | Chữ ký, cửa sổ replay khi phù hợp, idempotency, budget provider và xử lý gửi lại |

## 9. Profile tải và điều kiện nghiệm thu

Không ghi “chịu được nhiều request” mà thiếu workload. Hồ sơ phải có route mix, payload, dữ liệu, cache hit ratio, thời gian, RPS đến, concurrency, số replica và giới hạn dependency. Đặt threshold cho cả kết quả nghiệp vụ, latency và tài nguyên; không tính request bị reject là throughput thành công.

Ví dụ **minh họa cần thay bằng số đo**, không phải mặc định chạy production: 100 RPS với route mix đã mô tả, chạy ổn định 15 phút; p95 dưới 500 ms, p99 dưới 1 giây, lỗi không dự kiến dưới 1%. Profile burst và soak riêng phải ghi cường độ/thời gian, ngân sách queue, ngưỡng cảnh báo và thời gian trở lại bình thường. Ghi rõ cách phân loại 429/503 chủ đích; không loại chúng khỏi báo cáo tổng để che mất tác động.

Các kịch bản cần chọn theo hệ thống:

1. Tải bình thường và tải tăng dần tới giới hạn đã chọn, có đủ request để đánh giá percentile từng route quan trọng.
2. Burst vượt quota/concurrency: từ chối đúng policy, user/tenant khác và luồng quan trọng vẫn dùng được trong giới hạn mục tiêu.
3. Soak: theo dõi RAM, connection, queue lag, descriptor và tài nguyên sau nhiều chu kỳ.
4. Cache/limiter store mất kết nối, database/provider chậm, pool đầy: đúng failure policy, không tăng retry/queue không giới hạn.
5. Hai hoặc nhiều replica: quota tổng đúng phạm vi; scale up/down, restart, drain và job giao lại không gây mất hoặc nhân tác động nghiệp vụ.
6. Đầu vào quá cỡ/giải nén, kết nối chậm và tính năng đặc biệt: test có giới hạn, trên môi trường được phép và kiểm chứng từ chối sớm.

Chạy load test trên staging hoặc môi trường đã được chủ hệ thống chấp thuận, với dữ liệu giả và ngắt provider có thể phát sinh SMS/email/phí thật khi cần. Có thời lượng, RPS tối đa và điều kiện dừng; không chạy bài gây áp lực không giới hạn. Nếu dùng k6, khai báo threshold để bài test trả mã lỗi khi không đạt thay vì chỉ xuất biểu đồ; xem [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).

Gate `load` của ví dụ chạy `npm run test:load:ci`: đây phải là bài smoke có threshold, hoàn tất trong giới hạn 5 phút mỗi quality command của checker. Stress/soak dài chạy trong workflow riêng với thời lượng và điều kiện dừng phù hợp; liên kết artifact đúng commit vào hồ sơ trước phát hành. Bài smoke đạt không thay thế bằng chứng capacity dài hạn.

## 10. Quan sát, cảnh báo và hồ sơ bàn giao

Theo dõi tối thiểu các chỉ số có áp dụng: request đến/chấp nhận/từ chối, p95/p99 theo nhóm route, lỗi không dự kiến, 429/503, CPU/RAM/event-loop hoặc thread pool, pool wait/connections, cache hit/miss, queue depth/oldest age, worker retry/DLQ và tình trạng limiter/breaker. Chốt ngưỡng, khoảng đánh giá, người nhận và hành động của từng alert.

Log/tracing dùng request/job ID phù hợp; không đưa token, payload nhạy cảm, raw user/IP hoặc request ID có giá trị vô hạn vào metric labels. Chọn nhãn route template/status class để giới hạn cardinality. Dashboard phải phân biệt spike traffic, dependency chậm và hết quota của một tenant.

- [ ] Có [hồ sơ capacity](../templates/capacity.md) và [hồ sơ bảo mật](../templates/security.md), phiên bản config và người phụ trách.
- [ ] Policy có hiệu lực tại edge/app/dependency đang dùng; đường vào trực tiếp origin và proxy trust đã kiểm tra.
- [ ] Ngưỡng header/body/deadline/quota/concurrency/pool/queue được cấu hình, không chỉ viết trong docs.
- [ ] Có kết quả tải, abuse case và dependency failure; lưu raw report cùng nhận xét về giới hạn còn lại.
- [ ] Có alert, runbook quá tải, rollback/degrade và bằng chứng phục hồi/drain/restart.
- [ ] Các quality command `security-tests`, `dependency-audit`, `secret-scan`, `sast`, `load` áp dụng chạy công cụ thật, trả lỗi theo policy và được liên kết từ báo cáo; phần không áp dụng có lý do.

Checker cấu trúc, lint và unit test của bộ quy chuẩn không đo RPS hoặc chứng minh chống DDoS. Kết quả chỉ có giá trị với phiên bản, workload và môi trường được ghi trong báo cáo; thay đổi profile/hạ tầng cần xem lại số đo.
