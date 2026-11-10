# CSS variables tập trung và fallback

## Quy tắc áp dụng

Khi dùng CSS custom properties, dự án có **một file tổng** khai báo token và các giá trị theo theme, ví dụ `src/styles/variables.css`. File CSS con sử dụng `var(--token, giá-trị-default)`, không tự khai báo hoặc override biến. Component-specific token cũng nằm trong file tổng và có tên theo component.

- Mỗi token có giá trị gốc trong `:root` không phụ thuộc media/supports/container. Có thể đặt `:root` trong `@layer` nếu dự án dùng cascade layers.
- Light/dark chỉ override các tên đã có giá trị gốc, ngay trong file tổng. Đặt tên semantic như `--color-text`, `--color-surface`; không ràng buộc component vào màu `--white` khi ý nghĩa là nền.
- Mọi `var()` đều có fallback không rỗng, kể cả alias trong file tổng và `var()` lồng nhau. Tên biến phân biệt chữ hoa/thường; checker hiện hỗ trợ tên ASCII dạng `--name`, khuyến nghị kebab-case.
- Fallback không hợp thức hóa tên biến sai: `var(--typo, #fff)` vẫn lỗi nếu không khai báo `--typo` ở file tổng.
- Giá trị thiết kế như màu, khoảng cách, font và radius dùng token. Giá trị cấu trúc như `display: grid` không phải biến bắt buộc. Danh sách thuộc tính được kiểm tra có thể điều chỉnh.

Fallback dùng khi custom property không cung cấp được giá trị theo cơ chế CSS; không phải cách hỗ trợ browser không có CSS variables, và không bảo đảm sửa mọi giá trị sai kiểu ở computed-value time. Xem [MDN var()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/var).

## Ví dụ có thể kiểm tra

File tổng:

```css
/* src/styles/variables.css */
:root {
  --color-text: #172033;
  --color-surface: #ffffff;
  --space-card: 1rem;
}

:root[data-theme="dark"] {
  --color-text: #f1f5f9;
  --color-surface: #111827;
}
```

File con:

```css
/* src/features/catalog/card.css */
.card {
  color: var(--color-text, #172033);
  background-color: var(--color-surface, #ffffff);
  padding: var(--space-card, 1rem);
}
```

Import file tổng **một lần ở entry point stylesheet** trước styles cần dùng, hoặc theo convention build/framework. Bản ví dụ độc lập [card.css](../../examples/css/components/card.css) import [variables.css](../../examples/css/variables.css) để dễ thử; ứng dụng thật nên quản lý import tập trung, tránh nhân bản CSS sau build.

Không tạo lại một `:root` hoặc `--token` ở CSS con để vượt checker. Cần biến động do runtime, inline style hoặc CSS-in-JS thì mô tả contract và công cụ kiểm tra tương ứng; checker file `.css` không nhìn thấy những nguồn đó.

## Chạy checker

```sh
npm run check:css
node scripts/check-css.mjs --root ../du-an-khac --json
```

Thêm `css` vào danh sách `checks` và cấu hình:

```json
{
  "checks": ["docs", "structure", "assets", "css", "quality"],
  "css": {
    "enabled": true,
    "variablesFile": "src/styles/variables.css",
    "roots": ["src"]
  }
}
```

`variablesFile` được kiểm tra kể cả khi không nằm trong `roots`; các root là đường dẫn literal tới file/thư mục. Root trùng nhau không làm kiểm tra file hai lần. Chỉ đọc file `.css`, bỏ qua thư mục generated theo quy tắc chung, không đi qua symlink hoặc thoát root dự án. Không có CSS thì dùng `enabled: false` kèm `reason`; không khai báo `css` cũng được báo không áp dụng để tương thích profile cũ.

Checker dùng [PostCSS](https://postcss.org/api/) và [postcss-value-parser](https://github.com/postcss/postcss-value-parser). Cần `npm ci` trong repository chứa checker; khi chép checker sang dự án khác cần cài hai dependency này với phiên bản phù hợp/lockfile. Nếu checker được chọn nhưng thiếu parser thì báo lỗi nạp module, không coi là bỏ qua.

## Những gì checker bắt lỗi

| Kiểm tra | Ví dụ lỗi |
| --- | --- |
| File tổng tồn tại và có giá trị gốc | Chỉ khai báo biến bên trong dark media query |
| Khai báo tập trung | `.card { --local-color: red; }` ở file con |
| Đăng ký property tập trung | `@property --local` ở file con |
| Tên có giá trị gốc | Theme chỉ khai báo `--only-dark` mà không có trong `:root` |
| Token được tham chiếu tồn tại | `var(--color-tetx, #111)` |
| Có fallback cho mỗi lần gọi | `var(--color-text)` hoặc `var(--space, )` |
| Thuộc tính thiết kế được cấu hình dùng token | `color: #fff`, `padding: var(--space, 1rem) 2px` |
| CSS có thể parse và function/string được đóng | Rule bị thiếu dấu đóng |

Mặc định kiểm tra các thuộc tính màu riêng (`color`, `background-color`, `border-*-color`, `fill`, `stroke`...), font, line-height, letter-spacing, margin/padding gồm hướng logical, gap, radius và shadow. Xem danh sách chính xác trong [css-policy.mjs](../../scripts/lib/css-policy.mjs). Không tự mở rộng sang mọi shorthand hoặc custom property của framework; nếu dự án cần `background`, `border`, `width`... thì khai báo thêm trong `css.properties` và chọn token/keyword phù hợp.

`css.properties` thay thế toàn bộ danh sách thuộc tính thiết kế mặc định. `css.allowedValues` thay thế danh sách keyword được phép như `inherit`, `transparent`, `currentColor`, `none`, `auto`, `normal`, `0`. Danh sách rỗng phải là quyết định có review; nó không tắt việc kiểm tra khai báo tập trung, tên biến và fallback.

Giá trị của thuộc tính được kiểm tra có thể ghép nhiều `var()` hoặc keyword, ví dụ `margin: 0 auto`. Hỗ trợ `calc`, `min`, `max`, `clamp` với token và hệ số không đơn vị, ví dụ `calc(var(--space, 1rem) * 2)`. Giá trị có đơn vị/màu viết trực tiếp trong biểu thức cần chuyển vào token hoặc nằm trong fallback. Fallback có dấu phẩy như `var(--font-body, Arial, sans-serif)` hợp lệ. Không áp cơ chế này cho toàn bộ ngữ pháp CSS; mở rộng policy theo use case đã review.

## Giới hạn và nghiệm thu

- Không kiểm tra SCSS/Less, `<style>` trong Vue/Svelte, styled-components, CSS-in-JS, style inline, mã sinh hoặc CSS ngoài `roots`. Cần parser/plugin tương ứng hoặc quét output/source riêng; không dùng việc chưa scan để mặc định đạt.
- Không resolve chuỗi `@import`, không tải URL ngoài và không chứng minh file token thực sự có mặt trên trang. Cấu hình `roots` phải bao phủ source do dự án sở hữu; CSS vendor dùng policy riêng.
- Không mô phỏng cascade, inheritance, scope/shadow DOM, media query, chu kỳ token, kiểu giá trị sau thay thế, contrast hoặc browser support. Theme và UI cần được đo/kiểm thử trong browser.
- Sau khi đổi token: build production, kiểm tra computed styles, trạng thái tương tác, light/dark/system và nội dung dài ở locale được hỗ trợ. Không bỏ comment hữu ích hoặc viết giá trị thiết kế trực tiếp để lách policy.

Xem [dark/light mode](theme.md), [quy chuẩn UI](README.md) và [chạy các checker](../quality/README.md).
