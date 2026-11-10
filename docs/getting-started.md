# Cách áp dụng quy chuẩn

## Mục tiêu và mức yêu cầu

Quy chuẩn áp dụng cho dự án mới và dự án đang có. Mỗi dự án phải mô tả kiến trúc, thành phần đang dùng, cách chạy, kiểm tra và triển khai. Cây thư mục là hợp đồng về trách nhiệm; đường dẫn cụ thể được ánh xạ theo ngôn ngữ và framework.

- **Bắt buộc:** quy tắc áp dụng cho phạm vi đã chọn; phải có triển khai và bằng chứng kiểm tra.
- **Có điều kiện:** trở thành bắt buộc khi dùng tính năng tương ứng, ví dụ gateway khi tích hợp hệ thống ngoài, hooks khi tách logic React, validation khi nhận dữ liệu ngoài.
- **Không áp dụng:** ghi lý do trong hồ sơ dự án; không tạo thư mục rỗng hoặc hàm giả để vượt checker.

Không có một cấu trúc vật lý phù hợp mọi framework. Ví dụ Next.js có route/layout theo file, Vue có composables, NestJS có module/controller theo quy ước riêng. Giữ quy ước framework và khai báo đường dẫn thật trong `project-standards.json`.

## Cấu trúc bộ tài liệu

```text
docs/
├── README.md                 # Tổng quan và mục lục
├── getting-started.md        # Cách áp dụng quy chuẩn
├── frontend/README.md        # Kiến trúc và code phía client
├── backend/README.md         # Kiến trúc và code phía server
├── backend/reliability.md    # Chịu tải, giới hạn request và phục hồi
├── security/README.md        # Bảo mật ứng dụng và vận hành
├── ui/README.md              # Giao diện, BEM, accessibility
├── 3d/README.md              # Asset và hiệu năng 3D
├── quality/README.md         # Kiểm tra tự động và thủ công
└── templates/
    ├── project.md            # Điền thành docs/project.md ở dự án đích
    ├── review.md             # Hồ sơ kiểm tra một đợt bàn giao
    ├── security.md           # Mẫu threat model và đánh giá bảo mật
    ├── capacity.md           # Mẫu ngân sách request và báo cáo tải
    └── decision.md           # Mẫu ADR
```

Mỗi tài liệu chuyên môn nêu cấu trúc, trách nhiệm, quy tắc, checklist và giới hạn kiểm tra. Dự án đích bổ sung `docs/project.md`, `docs/decisions/`, API contract, sơ đồ và runbook theo nhu cầu. Không chứa secret, token, mật khẩu hoặc dữ liệu cá nhân trong docs và báo cáo.

## Cây dự án tham chiếu

```text
project/
├── README.md
├── docs/
├── apps/                     # Monorepo; repo đơn có thể dùng src/ trực tiếp
│   ├── web/src/              # Xem tài liệu frontend
│   └── api/src/              # Xem tài liệu backend
├── packages/                 # Chỉ khi có mã dùng chung độc lập
├── art/                      # Nguồn thiết kế, .blend; không đưa vào runtime bundle
├── public/models/            # Asset 3D đã export và tối ưu, nếu có
├── scripts/                  # Các checker độc lập và thư viện dùng chung
│   ├── check-project.mjs     # Điều phối kiểm tra tổng
│   ├── check-config.mjs      # Định dạng cấu hình
│   ├── check-docs.mjs        # Tài liệu và liên kết
│   ├── check-structure.mjs   # Cấu trúc, chọn scope theo dự án
│   ├── check-assets.mjs      # Runtime 3D và budget
│   ├── check-quality.mjs     # Các gate, có thể chọn từng lệnh
│   └── lib/                 # Config, context/report, CLI và filesystem
├── tests/                   # Kiểm thử, tách khỏi script thực thi
├── project-standards.json
└── .github/workflows/        # Hoặc CI tương ứng của dự án
```

Đây là lựa chọn tham chiếu, không ép ứng dụng đơn dùng monorepo. Không đặt cùng một trách nhiệm ở nhiều nơi chỉ để giống cây mẫu. Feature sở hữu code của nó; chỉ chuyển vào shared khi có nhu cầu dùng chung thực tế.

Trong chính repository bộ quy chuẩn, `scripts/` chứa các checker và `tests/` chứa toàn bộ file `*.test.mjs`. `project-standards.json` khai báo cấu trúc này để tự kiểm tra; `npm test` chạy kiểm thử trong `tests/`.

## Quy trình áp dụng

1. Điền [hồ sơ dự án](templates/project.md): stack, kiến trúc, thành phần bật/tắt, thiết bị đích, người phụ trách.
2. Chọn các phần [frontend](frontend/README.md), [backend](backend/README.md), [UI](ui/README.md), [3D](3d/README.md) có sử dụng; áp dụng [bảo mật](security/README.md) theo dữ liệu và bề mặt tấn công. Backend có API phải khai báo [giới hạn tài nguyên và cách chịu tải](backend/reliability.md).
3. Ánh xạ đường dẫn vào cấu hình checker. Khai báo component được dùng là `required: true`; nếu bỏ một mục cần có lý do trong hồ sơ. Một nhóm có nhiều feature thì khai báo từng feature cần kiểm tra, không chỉ feature đầu tiên.
4. Gắn công cụ kiểm tra thật và chạy theo [hướng dẫn chất lượng](quality/README.md).
5. Review bằng [mẫu bàn giao](templates/review.md). Ghi ngoại lệ bằng [quyết định kiến trúc](templates/decision.md), kèm phạm vi, bằng chứng, người duyệt và ngày xem lại.

## Quy tắc chung cho code và docs

- Đặt tên theo miền nghiệp vụ; `helpers`/`utils` không phải nơi gom mọi hàm không biết đặt ở đâu.
- Mỗi hàm xử lý mặc định tối đa **60 dòng**, cấu hình bằng `code.maxFunctionLines`. Tính cả khai báo, dòng đóng hàm, dòng trống và comment; áp dụng cho function, method, arrow function, callback và IIFE. Xem [cách kiểm tra và điều chỉnh giới hạn](quality/README.md#giới-hạn-dòng-của-hàm).
- Mỗi hàm có một trách nhiệm rõ ràng; tách bước xử lý có ý nghĩa và dùng lại logic chung. Không dồn nhiều câu lệnh lên một dòng, nhồi callback hoặc tách hàm thiếu ý nghĩa để vượt lint. Giới hạn dòng giúp dễ review, không thay thế kiểm tra logic trùng lặp.
- Không giữ import, biến, nhánh, file, dependency, asset hoặc đoạn code đã comment không còn dùng. Dùng lịch sử Git khi cần khôi phục.
- Kiểm tra dead code bằng công cụ hiểu ngôn ngữ/framework. Đăng ký rõ entry point động, generated code, migration và plugin trước khi xóa thứ công cụ báo chưa dùng.
- Không bỏ qua lỗi lint/type/test/build để hoàn tất checklist. Ngoại lệ phải có lý do, phạm vi và thời hạn.
- Kiểm soát bảo mật phải có chủ sở hữu, test từ chối truy cập sai quyền và bằng chứng scanner phù hợp. Dự án nhận request phải có giới hạn hữu hạn cho kích thước, thời gian, tần suất và công việc đồng thời; ngưỡng cụ thể dựa trên hồ sơ chịu tải, không suy ra từ cây thư mục.
- Cập nhật docs cùng thay đổi kiến trúc/API/config. Ghi lệnh thực thi được từ một checkout sạch; phân biệt biến môi trường bắt buộc và tùy chọn bằng file ví dụ không có giá trị bí mật.
- Dùng UTF-8, đường dẫn tương đối trong liên kết nội bộ, tên file/thư mục nhất quán và đúng chữ hoa/chữ thường để chạy trên Linux.
- Ghi phiên bản bộ quy chuẩn được áp dụng vào hồ sơ; `version: 1` trong JSON chỉ là phiên bản định dạng cấu hình checker.

Quy chuẩn ban đầu là v1.0.0. Khi thay đổi yêu cầu bắt buộc, ghi quyết định và hướng dẫn chuyển đổi; dự án cũ áp dụng có kế hoạch, không tự ý đổi cấu trúc đang chạy.
