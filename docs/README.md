# Quy chuẩn tài liệu và chất lượng dự án

Bộ tài liệu dùng lại cho các dự án web: thống nhất cách tổ chức frontend, backend, giao diện, mô hình 3D, bảo mật và khả năng chịu tải; kèm script kiểm tra cấu trúc, tài liệu, ngân sách asset và các lệnh kiểm tra của từng dự án.

Thư mục `docs/` chứa **bộ quy chuẩn** dùng làm tài liệu tham chiếu cho các dự án. Chọn các thành phần dự án thực sự sử dụng; không tạo controller, gateway hay hook rỗng chỉ để đủ cây thư mục. Quy tắc và trách nhiệm được giữ thống nhất, đường dẫn có thể ánh xạ theo framework. Mỗi hàm mặc định tối đa **60 dòng**, điều chỉnh bằng `code.maxFunctionLines` theo dự án và kiểm tra qua lint.

| Tài liệu | Nội dung |
| --- | --- |
| [Hướng dẫn áp dụng](getting-started.md) | Phạm vi, cấu trúc docs, bắt buộc và tùy chọn |
| [Frontend](frontend/README.md) | Routes, components, layouts, hooks, helpers, state và ranh giới module |
| [Backend](backend/README.md) | Controllers, middlewares, validation, services, repositories, gateways |
| [Bảo mật](security/README.md) | Phân quyền, dữ liệu, secrets, kiểm tra lỗ hổng và ứng phó sự cố |
| [Backend chịu tải và chống lạm dụng](backend/reliability.md) | Giới hạn request, timeout, cache, queue, backpressure và đo tải |
| [Giao diện](ui/README.md) | BEM, design tokens, responsive, accessibility và các trạng thái UI |
| [3D trên web](3d/README.md) | Quy trình Blender → glTF/GLB, giới hạn asset và đo hiệu năng |
| [Kiểm tra dự án](quality/README.md) | Cấu hình checker, quality gates, CI và giới hạn tự động hóa |
| [Mẫu hồ sơ dự án](templates/project.md) | Khai báo stack, thành phần sử dụng và ngân sách riêng |
| [Mẫu bàn giao](templates/review.md) | Bằng chứng kiểm tra trước khi merge hoặc phát hành |
| [Mẫu đánh giá bảo mật](templates/security.md) | Threat model, kiểm soát, bằng chứng và ngoại lệ |
| [Mẫu hồ sơ chịu tải](templates/capacity.md) | Ngưỡng theo endpoint, kịch bản tải và kết quả đo |
| [Mẫu quyết định kiến trúc](templates/decision.md) | Ghi lại thay đổi và ngoại lệ có lý do |

## Chạy ngay trong repository này

Chạy các lệnh dưới đây từ thư mục gốc repository, nơi chứa `package.json`.

Cần Node.js 22.13+ thuộc nhánh 22 hoặc Node.js 24+. Script kiểm tra tĩnh chỉ dùng thư viện có sẵn của Node; chạy đầy đủ quality gates cần cài dev dependencies, gồm ESLint để kiểm tra giới hạn dòng của hàm.

```sh
npm ci
node scripts/check-project.mjs --run
```

Lệnh trên điều phối các checker riêng để kiểm tra docs, cấu trúc, asset và quality gates. Tương đương `npm run check` sau khi cài dependencies. Dùng `npm run check:static` nếu chỉ muốn kiểm tra tĩnh; kết quả sẽ ghi rõ các quality gate chưa chạy.

Chạy từng phần bằng `npm run check:config`, `npm run check:docs`, `npm run check:structure`, `npm run check:assets` hoặc `npm run check:quality`. Phần logic nằm trong các script tương ứng; `check-project.mjs` chỉ điều phối. Xem [các checker độc lập và cách chọn scope/gate](quality/README.md#các-checker-độc-lập).

Danh sách `checks` trong `project-standards.json` chọn các nhóm chạy tổng. Với từng checker được chọn, có file thì chạy, thiếu file thì báo `SKIP`; lỗi bên trong file đã có vẫn được báo lỗi.

## Áp dụng vào dự án khác

1. Chép `docs/`, thư mục `scripts/` cùng `scripts/lib/` và `project-standards.json` vào dự án đích. Chép thêm `tests/` nếu muốn chạy bộ kiểm thử của checker; cấu hình `structure` và các command cần được đổi theo cấu trúc/lệnh thực tế của dự án đích. Chọn nội dung cần dùng, giữ các phần không áp dụng có giải thích trong hồ sơ dự án.
2. Điền [hồ sơ dự án](templates/project.md), chốt cấu trúc và ánh xạ đường dẫn theo framework.
3. Tham khảo [cấu hình fullstack](../examples/project-standards.fullstack.json), bật đúng phạm vi, khai báo các thành phần và quality gate có triển khai thực tế. Cấu hình này là ví dụ cần chỉnh, không chạy nguyên trạng trên mọi dự án.
4. Cài và cấu hình công cụ lint, typecheck, test, build, tìm code/dependency thừa của dự án. Gắn giới hạn `code.maxFunctionLines` vào công cụ hiểu đúng ngôn ngữ/framework của dự án; chỉ chép JSON chưa tự kiểm tra được độ dài hàm. Với ứng dụng thật, bổ sung security gates và kiểm thử tải theo phạm vi; thay các lệnh trong cấu hình bằng lệnh thật, không dùng lệnh luôn trả về thành công.
5. Chạy checker tại dự án đích hoặc từ repo chuẩn:

```sh
node scripts/check-project.mjs --root ../du-an-khac --run
```

Thêm lệnh này vào CI. Cấu hình trong repo hiện tại dùng cho **tài liệu**, nên không bắt có mã frontend/backend hoặc asset runtime. `art/` chứa file thiết kế nguồn; ngân sách 3D chỉ áp dụng cho thư mục runtime đã khai báo.

Script kiểm tra đường dẫn, file/thư mục có nội dung, liên kết Markdown nội bộ, giới hạn byte và cấu trúc cơ bản glTF/GLB. Lint, code thừa, tính đúng nghiệp vụ, bảo mật runtime, sức chịu tải, accessibility, draw calls và FPS cần công cụ chuyên dụng cùng kiểm tra thực tế; xem [phạm vi kiểm tra](quality/README.md).
