# Quy chuẩn giao diện

Áp dụng cho website, ứng dụng web và màn hình nhúng nội dung 3D. Phần này quy định cách trình bày và tương tác; cách tổ chức mã nguồn nằm ở [frontend](../frontend/README.md).

## 1. Design tokens và component

**Bắt buộc khi có giao diện:** định nghĩa nguồn giá trị dùng chung cho màu, typography, spacing, radius, shadow, z-index và breakpoint. Khi dùng CSS custom properties, khai báo trong một file tổng `variables.css`; file CSS con dùng `var(--token, default)` và không tự khai báo lại biến. Nếu dùng theme của UI library hoặc công cụ token hiện có, ghi mapping và pipeline tương ứng; tránh thêm một hệ thống trùng lặp. CSS variables không thay thế breakpoint literal trong media query của CSS thông thường.

```css
:root {
  --color-text: #172033;
  --color-surface: #ffffff;
  --color-action: #1d4ed8;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --radius-control: 0.5rem;
}
```

Token phải mang ý nghĩa (`--color-text-muted`, `--color-danger`) để hỗ trợ theme; token thô có thể dùng trong tầng định nghĩa. Giá trị trên chỉ minh họa, không phải palette bắt buộc. Kiểm tra contrast trên các cặp màu được render thực tế, gồm theme tối và trạng thái tương tác.

- Component dùng lại có contract về props, events/slots, variant, kích thước và accessibility.
- Mỗi control có trạng thái mặc định, hover, focus-visible, active, disabled và loading khi có liên quan.
- Mỗi vùng dữ liệu có loading, empty, error, success; lỗi có cách thử lại hoặc hành động tiếp theo.
- Ghi hành vi khi nội dung dài, số lớn, ảnh hỏng, dữ liệu thiếu và người dùng thay đổi cỡ chữ.

## 2. BEM và phạm vi CSS

Dự án phải ghi rõ chiến lược CSS đang dùng. Chuẩn mặc định cho CSS global là BEM dạng **Two Dashes**: `block`, `block__element`, `block--modifier`. Đây là một cách đặt tên được mô tả trong [tài liệu BEM](https://bem.info/en/methodology/naming-convention/); không trộn với kiểu modifier dấu gạch dưới trong cùng codebase.

```html
<article class="product-card product-card--featured">
  <h2 class="product-card__title">Tên sản phẩm</h2>
  <button class="product-card__button" type="button">Xem chi tiết</button>
</article>
```

```css
.product-card { background-color: var(--color-surface, #ffffff); }
.product-card__title { color: var(--color-text, #172033); }
.product-card--featured { border: 2px solid var(--color-action, #1d4ed8); }
```

- Block là một đơn vị độc lập; element thuộc block, modifier biểu diễn biến thể hoặc trạng thái.
- Không lồng tên thành `product-card__body__title`; element vẫn là `product-card__title` dù DOM có nhiều tầng.
- Modifier xuất hiện cùng class gốc: `product-card product-card--featured`.
- Tránh selector dựa vào vị trí trang hoặc cấu trúc DOM sâu, ID selector cho styling và `!important` để sửa chồng lỗi. Ngoại lệ có lý do được ghi tại code hoặc tài liệu.
- Tách utility global có prefix rõ như `u-visually-hidden`; không dùng utility làm tên block ngẫu nhiên.

**CSS Modules / scoped CSS:** component là ranh giới scope. Có thể giữ BEM cục bộ như `styles['product-card__title']` hoặc dùng tên ngắn `styles.title`; chọn một cách trong hồ sơ dự án. Selector phát sinh sau build không cần khớp BEM. Nếu dùng utility-first hoặc UI library, khai báo chiến lược đó và quy tắc đặt tên cho CSS tùy chỉnh; không ép class utility thành BEM.

Stylelint với selector naming rule có thể kiểm tra cú pháp đặt tên. Nó không xác nhận block/element có đúng ý nghĩa hoặc class có được sử dụng trong mọi template động. Những điểm này cần review và phân tích theo framework.

## 3. Accessibility

Mục tiêu mặc định của bộ quy chuẩn là **WCAG 2.2 mức AA** đối với phần sản phẩm áp dụng. Checklist dưới là tập kiểm tra tối thiểu, không thay cho đánh giá toàn bộ tiêu chí. Nguồn chuẩn: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

| Nội dung | Tiêu chí nghiệm thu |
| --- | --- |
| Ngữ nghĩa | Dùng heading có thứ bậc, landmark; dùng `button` cho hành động, `a` cho điều hướng |
| Bàn phím | Hoàn thành luồng chính bằng Tab, Shift+Tab, Enter/Space; không kẹt focus |
| Focus | Focus nhìn thấy và không bị che hoàn toàn; thứ tự theo luồng đọc |
| Form | Input có label; lỗi gắn với trường; không chỉ dùng màu để báo lỗi |
| Tên truy cập | Icon button có accessible name; ảnh có alt đúng vai trò; ảnh trang trí có alt rỗng |
| Hộp thoại | Có tên, quản lý focus khi mở/đóng; thao tác đóng rõ ràng; trả focus hợp lý |
| Thông báo động | Loading, lỗi hoặc kết quả quan trọng được thông báo phù hợp với công nghệ hỗ trợ |
| Chuyển động | Tôn trọng `prefers-reduced-motion`; có điều khiển cho nội dung chuyển động khi cần |
| Nội dung 3D | Có mô tả/ảnh thay thế và cách thực hiện tác vụ cốt lõi khi canvas không dùng được |

Văn bản thường cần contrast tối thiểu **4.5:1**, văn bản lớn **3:1**, theo định nghĩa và ngoại lệ của [SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Không làm tròn kết quả thấp hơn ngưỡng thành đạt.

Vùng nhấn đạt ít nhất **24 × 24 CSS px** hoặc thỏa ngoại lệ của [SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Bộ quy chuẩn khuyến nghị **44 × 44 CSS px** cho control cảm ứng chính; đây là mục tiêu thiết kế nội bộ, không phải cách diễn đạt thay thế cho mọi yêu cầu WCAG AA.

## 4. Responsive và nội dung

- Bố cục ưu tiên màn hình nhỏ; chọn breakpoint tại nơi nội dung bắt đầu vỡ. Ghi breakpoint thật trong token/theme.
- Kiểm tra tối thiểu ở chiều rộng **320, 768 và 1440 CSS px** theo ma trận nội bộ; bổ sung thiết bị/trình duyệt được dự án hỗ trợ. Không xem ba kích thước này là toàn bộ yêu cầu responsive.
- Kiểm tra zoom 200%; với reflow, kiểm tra ở chiều rộng tương đương 320 CSS px. Nội dung thường không cuộn ngang; bảng dữ liệu, bản đồ hoặc cảnh 3D có thể cần cách xử lý riêng theo tiêu chí áp dụng.
- Không dùng chiều cao cố định cho vùng văn bản có thể dài. Kiểm tra tiếng Việt có dấu, tiêu đề dài, text wrap và empty state.
- Ảnh có kích thước hoặc aspect ratio để giữ chỗ; chọn kích thước nguồn phù hợp và lazy-load ảnh ngoài vùng nhìn khi phù hợp.
- Không khóa hướng màn hình nếu không có yêu cầu thiết yếu. Sidebar, menu và modal phải dùng được trên màn hình hẹp.

## 5. Hồ sơ bàn giao

Các tính năng có hướng dẫn riêng:

- [CSS variables và fallback](css-variables.md): file tổng, giới hạn checker, cấu hình và ví dụ chạy được.
- [Dark / light / system mode](theme.md): token theo theme, persistence, SSR/first paint và accessibility.
- [Đa ngôn ngữ](../frontend/i18n.md): catalog, locale/fallback, định dạng, RTL và ma trận kiểm thử.

Lưu tại docs của dự án hoặc design system, liên kết từ hồ sơ dự án:

1. Nguồn tokens và chiến lược CSS/BEM đã chọn.
2. Danh sách component dùng chung và trạng thái được hỗ trợ.
3. Ma trận trình duyệt, thiết bị và kích thước cần hỗ trợ.
4. Ảnh chụp hoặc bản mẫu cho các màn hình và trạng thái chính.
5. Kết quả kiểm tra accessibility, responsive và các vấn đề còn mở có người phụ trách.

## 6. Checklist trước merge

- [ ] Component và style nằm đúng phạm vi; không còn CSS hoặc asset đã bỏ dùng theo công cụ và review.
- [ ] Token được dùng thống nhất; variant và trạng thái lỗi/loading/empty đầy đủ.
- [ ] CSS variables tập trung, mọi `var()` có fallback; checker CSS đạt trên source nằm trong phạm vi.
- [ ] Khi có theme/i18n: light/dark/system, preference persistence và mọi locale được hỗ trợ đã được kiểm tra cùng nhau.
- [ ] Không có lỗi layout tại các viewport đã chọn, nội dung dài và zoom 200%.
- [ ] Luồng bị ảnh hưởng dùng được chỉ bằng bàn phím; focus và label đã kiểm tra.
- [ ] Contrast và kích thước vùng nhấn được đo trên trạng thái thực tế.
- [ ] Công cụ accessibility tự động không còn lỗi chặn theo cấu hình dự án; đã kiểm tra thủ công các điểm công cụ không xác nhận được.
- [ ] Nếu có 3D, loading/progress, lỗi tải, fallback và chế độ giảm chuyển động đã kiểm tra.
- [ ] Production build và các gate được khai báo trong [quy chuẩn kiểm tra](../quality/README.md) đã đạt.

Checker cấu trúc không tự đánh giá thiết kế, semantic BEM hay sự phù hợp đầy đủ với WCAG. Dự án phải kết hợp lint/stylelint, công cụ accessibility và kiểm tra thủ công theo checklist này.

[Về tài liệu chung](../README.md)
