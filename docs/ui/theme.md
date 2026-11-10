# Dark / light / system mode

Áp dụng khi sản phẩm có chuyển theme. Dự án chốt các chế độ hỗ trợ và mặc định trong hồ sơ; mẫu này hỗ trợ `light`, `dark`, `system`. Theme là lựa chọn độc lập với ngôn ngữ, tài khoản và route.

## Cấu trúc và nguồn dữ liệu

```text
src/
├── styles/variables.css       # Toàn bộ token gốc và override theo theme
├── shared/theme/              # Trạng thái preference, persistence, lifecycle
└── shared/components/         # Theme selector có accessible name
```

Giữ convention framework: React có thể dùng provider/hook, Vue dùng composable/store, ứng dụng nhỏ có module riêng. Không tạo nhiều store đọc ghi theme cạnh tranh nhau.

- **Preference** là `light`, `dark` hoặc `system`, có thể được lưu để khôi phục.
- **Resolved theme** là light/dark đang hiển thị. Với system, nó phụ thuộc `prefers-color-scheme`; không ghi đè preference thành resolved theme.
- Ưu tiên lựa chọn rõ ràng của người dùng; nếu chưa có thì theo system; browser không khớp dark dùng light làm nền tảng.
- Khi người dùng chọn system, tiếp tục phản hồi khi OS đổi theme. Listener có lifecycle rõ ràng và được dọn khi không còn dùng; không đăng ký lại mỗi lần render.

## CSS và token

Mọi giá trị token gốc và override nằm trong một file theo [quy chuẩn CSS variables](css-variables.md). File con chỉ gọi `var(--token, fallback)`.

```css
:root {
  color-scheme: light;
  --color-text: #172033;
  --color-surface: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="dark"]) {
    color-scheme: dark;
    --color-text: #f1f5f9;
    --color-surface: #111827;
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --color-text: #f1f5f9;
  --color-surface: #111827;
}

:root[data-theme="light"] { color-scheme: light; }
```

Trong mẫu này, không có `data-theme` nghĩa là system. Khi chọn light/dark thì đặt thuộc tính tương ứng trên `<html>`; khi chọn system thì xóa thuộc tính. Selector media không thắng lựa chọn thủ công. Xem ví dụ đầy đủ [variables.css](../../examples/css/variables.css).

`prefers-color-scheme` cho biết preference của môi trường, còn `color-scheme` thông báo scheme cho browser controls, scrollbar và phần UI do browser vẽ; nó không tự tạo palette cho component. Tham khảo [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/) và [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme).

## Khởi tạo và persistence

1. Chuẩn hóa preference theo allowlist; không dùng giá trị bất kỳ từ storage/URL làm attribute hoặc tên file.
2. Khôi phục lựa chọn trước first paint bằng cách phù hợp với stack: server đọc cookie preference hoặc bootstrap sớm được CSP cho phép. Không phát sinh flash theme trái với preference chỉ vì chờ app mount.
3. Với SSR, server và client thống nhất trạng thái khởi tạo. Không dùng phép đo client-only để tạo HTML khác trong lần hydration đầu; system theme có thể được CSS media giải quyết.
4. Khi người dùng đổi preference, cập nhật DOM/store nhất quán và lưu theo policy. `localStorage`/cookie có thể không truy cập được; xử lý lỗi và vẫn cho đổi theme trong phiên hiện tại.
5. Khi đồng bộ giữa tab hoặc thiết bị, có thứ tự ưu tiên rõ; không ghi lại preference mỗi lần OS đổi theme và không ghi đè lựa chọn mới bằng state cũ.

Nếu dùng cookie, không lưu secret trong cookie theme và cấu hình thuộc tính theo môi trường. Bootstrap inline cần nonce/hash theo CSP, không bật `unsafe-inline` rộng chỉ để đổi theme. Không tự đoán theme từ quốc gia hoặc locale.

## UI và accessibility

- Dùng control hỗ trợ bàn phím và có tên rõ ràng: light, dark, theo hệ thống. Nhãn và thông báo trạng thái đi qua i18n khi ứng dụng có đa ngôn ngữ.
- Contrast, focus ring, disabled/error states, links, overlay, skeleton và placeholder phải được kiểm tra ở cả hai theme. Hai màu cùng token không chứng minh contrast đạt.
- Ảnh, biểu đồ, code block và canvas/3D có nền hoặc material riêng cần mapping theme phù hợp; không đảo màu toàn trang để giả lập dark mode.
- Chuyển theme không làm mất focus, nội dung form hoặc preference ngôn ngữ. Tránh transition toàn bộ thuộc tính; tôn trọng `prefers-reduced-motion` nếu thêm hiệu ứng.
- Fallback trong `var()` chỉ là giá trị dự phòng; nếu token chưa load, fallback sáng có thể không hợp với phần còn lại đang tối. Kiểm tra thứ tự stylesheet và first paint thay vì dựa vào fallback để sửa theme thiếu.

## Kiểm thử và hồ sơ bàn giao

| Kịch bản | Kết quả cần xác nhận |
| --- | --- |
| Chưa có preference, OS light/dark | Theme theo system, browser controls phù hợp |
| Chọn thủ công trái OS | Preference thủ công thắng và được khôi phục sau reload |
| Đang ở system rồi đổi OS | Đổi resolved theme, preference vẫn là system |
| Chuyển light/dark/system nhiều lần | Không nhân listener, không mất state hoặc focus |
| Storage lỗi, JS chậm/tắt, SSR | Có nền tảng đọc được, không hydration mismatch, policy first paint rõ |
| Đổi locale, route hoặc tài khoản | Đúng quy tắc persistence, không tự reset theme ngoài policy |
| Trạng thái lỗi, modal, focus, chart/3D | Đọc được và tương tác được trong mọi theme |

Lưu thiết bị/browser, kết quả kiểm tra contrast và ảnh chụp các trạng thái chính. Có test preference/persistence, component test của control và e2e các luồng quan trọng. Checker CSS xác nhận token/fallback trong source, không tự bấm theme selector hoặc xác nhận hình ảnh runtime.

Xem [UI](README.md), [đa ngôn ngữ](../frontend/i18n.md) và [mẫu hồ sơ dự án](../templates/project.md).
