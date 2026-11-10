# Quy chuẩn frontend

Áp dụng cho ứng dụng web có frontend. Dự án chỉ có backend đánh dấu phần này là không áp dụng trong hồ sơ dự án. Quy chuẩn tổ chức theo trách nhiệm; tên và vị trí thực tế được ánh xạ trong cấu hình kiểm tra dự án.

## 1. Mức áp dụng

- **Bắt buộc:** xác định entry point, nơi khai báo route, component, giao tiếp API, cấu hình môi trường, tài nguyên và cách kiểm tra trước khi merge.
- **Bắt buộc khi sử dụng:** có nơi riêng cho layout dùng chung, hooks/composables, state toàn cục, validation, helpers và các thành phần khác trong bảng dưới.
- **Tùy chọn:** tạo tầng trừu tượng, thư viện state hoặc thư mục dùng chung khi có nhu cầu thực tế. Không tạo thư mục rỗng chỉ để đạt checklist.
- Nếu framework quy định cấu trúc khác, giữ convention của framework và ghi ánh xạ tương đương. Ví dụ `app/`, `pages/` có thể đảm nhiệm route thay cho `routes/`.

## 2. Cấu trúc tham chiếu

Ví dụ dưới minh họa các trách nhiệm có thể xuất hiện; một ứng dụng không cần sử dụng tất cả.

```text
apps/web/
├── public/                         # File phục vụ trực tiếp, không chứa bí mật
├── src/
│   ├── app/                        # Bootstrap, providers và cấu hình ứng dụng
│   ├── routes/                     # Route, route loader và error boundary
│   ├── layouts/                    # Khung trang dùng chung
│   ├── features/
│   │   └── checkout/
│   │       ├── components/         # UI riêng của checkout
│   │       ├── hooks/              # React hooks; Vue dùng composables/
│   │       ├── services/           # API và chuyển đổi DTO của feature
│   │       ├── validation/         # Schema đầu vào của feature
│   │       ├── state/              # State dùng chung trong feature, nếu cần
│   │       ├── helpers/            # Hàm có ngữ nghĩa riêng của checkout
│   │       ├── types/              # Kiểu dữ liệu của feature
│   │       ├── tests/              # Test hành vi quan trọng
│   │       └── index.ts            # API công khai nếu feature có consumer
│   ├── shared/
│   │   ├── components/             # UI dùng ở nhiều feature
│   │   ├── hooks/                  # React; hoặc composables/ cho Vue
│   │   ├── services/               # HTTP client, telemetry adapter
│   │   ├── helpers/                # Helper chung có phạm vi được đặt tên rõ
│   │   ├── utils/                  # Hàm thuần không phụ thuộc nghiệp vụ
│   │   ├── types/                  # Kiểu thực sự dùng chung
│   │   ├── constants/
│   │   └── validation/             # Schema chung nếu có
│   ├── state/                      # State toàn ứng dụng nếu có
│   ├── styles/                     # Tokens, reset, styles toàn cục
│   └── assets/                     # Ảnh, font, icon qua build pipeline
├── tests/e2e/                      # Hành trình người dùng xuyên feature
├── .env.example                    # Tên biến và giá trị mẫu an toàn
└── package.json
```

Có thể đặt test cạnh mã nguồn bằng `*.test.ts`, `*.test.tsx` hoặc `*.spec.ts` thay cho `tests/`. Dự án nhỏ có thể bắt đầu với cấu trúc theo tầng (`components/`, `services/`, `routes/`); khi nhiều nghiệp vụ xuất hiện, gom mã liên quan thành feature. Ghi quyết định này trong hồ sơ dự án để checker dùng đúng đường dẫn.

| Thành phần | Trách nhiệm | Không đặt tại đây |
| --- | --- | --- |
| `app` | Khởi tạo ứng dụng, providers, wiring | Nghiệp vụ chi tiết của từng feature |
| `routes` / `pages` | Ghép trang, tham số URL, trạng thái tải/lỗi của route | HTTP client dùng chung, nghiệp vụ lặp lại |
| `components` | Hiển thị, tương tác và props/events | Bí mật server, truy cập database |
| `layouts` | Header, navigation, vùng nội dung chung | Form riêng của một nghiệp vụ |
| `hooks` / `composables` | Logic có state, reactive effects và lifecycle | Hàm format thuần chỉ vì muốn đặt tiền tố `use` |
| `services` | Gọi API, timeout, hủy request, ánh xạ dữ liệu | JSX, template, quyết định layout |
| `validation` | Schema và thông báo lỗi đầu vào | Kiểm soát truy cập thay cho server |
| `state` | State cần chia sẻ và quy tắc cập nhật | Bản sao dữ liệu server không có cơ chế đồng bộ |
| `helpers` | Hàm hỗ trợ một nghiệp vụ được đặt tên rõ | Tệp gom mọi thứ như `common.ts` |
| `utils` | Hàm thuần và tổng quát, ví dụ xử lý chuỗi | Dependency vào route hoặc feature |
| `types` | Kiểu, contract sử dụng trong phạm vi tương ứng | Toàn bộ DTO không liên quan đến consumer |
| `styles` / `assets` | Giao diện và tài nguyên đã tối ưu | Model nguồn `.blend`, file xuất thử, bản sao bỏ quên |

Không bắt buộc tách cả `helpers` và `utils` nếu dự án chỉ cần một loại. Khi cả hai tồn tại, tuân theo ranh giới trong bảng.

## 3. Ranh giới phụ thuộc

Luồng phụ thuộc: `app/routes → features → shared`. Shared không import ngược từ feature hoặc route. Feature khác chỉ dùng API công khai được công bố; tránh import sâu vào nội bộ. Tách contract dùng chung khi xuất hiện vòng phụ thuộc, thay vì thêm re-export để che vòng đó.

- Component tái sử dụng nhận dữ liệu qua props/slots và phát callback/event. Component container hoặc hook/composable điều phối request và state.
- Logic tính giá, quyền và validation mang tính nghiệp vụ có hàm hoặc module riêng để kiểm tra độc lập.
- Frontend validation phục vụ trải nghiệm; backend vẫn phải kiểm tra dữ liệu và quyền truy cập.
- Chỉ nâng mã lên `shared` khi có consumer thực tế hoặc một contract nền tảng rõ ràng. Không tạo abstraction chỉ để dự đoán tương lai.
- Dùng import alias được cấu hình đồng nhất cho runtime, type checker và test runner. Nếu dùng rule kiểm tra import boundaries, cấu hình theo chính sơ đồ đã chọn.

## 4. Đặt tên và convention framework

| Đối tượng | Quy ước mặc định | Ví dụ |
| --- | --- | --- |
| Component / layout | PascalCase | `ProductCard.tsx`, `AccountLayout.vue` |
| React hook | camelCase, tiền tố `use` | `useCart.ts` |
| Vue composable | camelCase, tiền tố `use` | `useCart.ts` trong `composables/` |
| Hàm, biến | camelCase; tên mô tả hành vi | `formatPrice`, `isSubmitting` |
| Kiểu, interface | PascalCase | `CartItem`, `CheckoutInput` |
| Hằng thực sự bất biến dùng chung | UPPER_SNAKE_CASE | `MAX_UPLOAD_BYTES` |
| Thư mục feature, asset | kebab-case | `order-history/`, `empty-cart.svg` |
| Tệp route đặc biệt | Theo framework | `page.tsx`, `layout.tsx`, `[id].vue` |

Chọn một convention cho tệp service và helper, ví dụ `cart.service.ts`, rồi dùng thống nhất. Tránh tên `misc`, `temp`, `new`, `final2`.

Với React, tuân theo [Rules of React](https://react.dev/reference/rules) và bật lint cho hooks. Với Vue Composition API, dùng [composables](https://vuejs.org/guide/reusability/composables) để tách logic reactive. Cả hai phải dọn listener, timer và subscription khi không còn sử dụng; request cần xử lý tình huống response cũ về sau response mới.

Framework có server/client boundary phải giữ code database, secret và server SDK ở server. Biến môi trường được xuất vào bundle phía client là dữ liệu công khai.

## 5. Chất lượng và hiệu năng

- Function, component function, hook/composable, method và callback mặc định tối đa **60 dòng**, theo `code.maxFunctionLines`. Tính cả khai báo, dòng đóng, dòng trống/comment và phần JSX trong hàm; tách xử lý có trách nhiệm rõ ràng, không dồn code để lách rule. Xem [quy tắc và cách điều chỉnh](../quality/README.md#giới-hạn-dòng-của-hàm).
- Mỗi route có trạng thái loading, empty, error và success phù hợp; tránh màn hình trống khi request thất bại.
- Không còn import, biến, export, file, dependency và CSS không dùng trong phạm vi đã kiểm tra. Xóa code comment bỏ lại, log debug và file xuất thử trước merge.
- Lint/typecheck phát hiện được một phần code thừa. Dùng thêm công cụ phân tích unused exports/files/dependencies nếu cần, khai báo entry points và dynamic imports để tránh xóa nhầm.
- Bundle analyzer và kiểm thử build xác nhận code splitting; không coi tree shaking là bằng chứng toàn bộ mã nguồn sạch.
- Lazy-load route hoặc tính năng nặng khi phù hợp. Tài nguyên 3D tuân theo [quy chuẩn 3D](../3d/README.md).
- Ghi ngân sách JS/CSS, ảnh, font, request và chỉ số trải nghiệm cho route quan trọng trong hồ sơ dự án. Đo production build trên thiết bị/mạng mục tiêu; không suy luận tốc độ từ kích thước source.

## 6. Kiểm tra trước merge

Các lệnh thật phải được khai báo trong cấu hình kiểm tra của dự án. Với monorepo, chọn đúng package hoặc workspace trong lệnh để không vô tình chỉ kiểm tra một ứng dụng. Tham khảo [quy chuẩn kiểm tra](../quality/README.md).

Trong `structure[]`, khai báo scope frontend với `root` là thư mục ứng dụng. Mỗi phần tử `components[]` có `name`, `paths` và `required`; `paths` là các đường dẫn literal thay thế nhau, tương đối với `root`, và có thể trỏ tới thư mục hoặc tệp convention của framework. Đặt `required: true` cho thành phần thực sự cần dùng. Scope không áp dụng có `enabled: false` và `reason`. Không dùng tên thư mục có sẵn để tự suy luận rằng một capability đã được triển khai.

Ví dụ fragment cho một ứng dụng React có custom hooks:

```json
{
  "structure": [
    {
      "name": "frontend",
      "enabled": true,
      "root": "apps/web",
      "components": [
        { "name": "components", "paths": ["src/shared/components", "src/components"], "required": true },
        { "name": "routes", "paths": ["src/routes", "src/app/page.tsx"], "required": true },
        { "name": "hooks", "paths": ["src/shared/hooks", "src/hooks"], "required": true }
      ]
    }
  ]
}
```

Điều chỉnh đường dẫn theo dự án; đây không phải cấu hình hoàn chỉnh. Checker yêu cầu implementation trong đường dẫn được kiểm tra; chỉ có `README.md` hoặc `.gitkeep` không đủ. Khai báo các gate cần chạy trong `quality.required`, ánh xạ lệnh ở `quality.commands`. Chỉ khi thêm `--run` checker mới thực thi các lệnh đó.

| Gate | Bằng chứng cần có |
| --- | --- |
| Cấu trúc | Các capability bật có đường dẫn tương ứng; capability không dùng có lý do |
| Lint / format | Lệnh trả mã thoát 0; không bỏ qua lỗi bằng `|| true` |
| Typecheck | Chạy khi dùng TypeScript hoặc hệ thống kiểu tương đương |
| Unused code | Không còn lỗi từ công cụ đã cấu hình; review phần tool không phân tích được |
| Tests | Unit cho logic quan trọng; integration/e2e cho luồng chính và lỗi thực tế |
| Build | Production build thành công với cấu hình mẫu an toàn |
| UI | Hoàn thành [checklist giao diện](../ui/README.md) trên route bị ảnh hưởng |

Checker cấu trúc chỉ xác nhận những gì được cấu hình. Một thư mục `hooks/` tồn tại không chứng minh hooks đúng, component có accessibility hay dự án không còn dead code; các việc này cần công cụ chuyên biệt và review.

[Về tài liệu chung](../README.md)
