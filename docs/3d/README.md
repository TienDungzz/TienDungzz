# Quy chuẩn mô hình 3D cho web

Áp dụng khi dự án có mô hình, hoạt cảnh hoặc scene 3D. Dự án không dùng 3D ghi rõ `Không áp dụng` trong hồ sơ dự án. Quy chuẩn này phân biệt **file nguồn**, **asset chạy trên web** và **chi phí render thực tế**.

## 1. Tổ chức file

```text
art/                         # Nguồn để chỉnh sửa, không được deploy trực tiếp
  characters/
    character-name.blend
  textures/                  # Texture gốc nếu có
public/
  models/                    # Bản xuất phục vụ runtime, checker kiểm tra thư mục này
    character-name/
      character-name.glb
      poster.webp            # Ảnh thay thế trước khi tải/không chạy được 3D
  decoders/                  # Chỉ khi cần Draco/Meshopt/KTX2 và cách build yêu cầu
src/
  features/
    viewer/
      components/
      loaders/
      hooks/                 # Hoặc composables theo framework
      helpers/
docs/
  3d/
    performance-report.md    # Báo cáo đo của dự án, dùng mẫu ở cuối trang
```

- Giữ nguồn `.blend`, `.fbx`, `.psd` và texture gốc ngoài thư mục runtime. Hai file `.blend` hiện có trong `art/characters/` là nguồn; quy chuẩn này không chỉnh sửa hoặc xuất lại chúng.
- Ưu tiên `.glb` để đóng gói thuận tiện; `.gltf` được dùng khi có lý do tách resource. Tên file dùng `kebab-case`, có tên miền nghiệp vụ; không dùng `final-final-2.glb`.
- Mỗi asset phải truy ra nguồn, người phụ trách, quyền sử dụng, tỷ lệ/đơn vị, các animation cần dùng và phiên bản xuất. Lưu thông tin trong báo cáo hoặc manifest của dự án.
- Thư mục runtime phải chỉ chứa bản dùng thực tế và resource phụ thuộc. Không giữ bản backup, bản xuất cũ hoặc asset chưa dùng; không tạo thư mục rỗng để đủ sơ đồ.

glTF có thể tham chiếu buffer và ảnh bên ngoài; cả GLB cũng có thể có resource ngoài. Trong bộ chuẩn này, resource phải nhúng hoặc là đường dẫn tương đối tới file có thật bên trong thư mục runtime đã khai báo; không phụ thuộc URL ngoài, đường dẫn máy cá nhân hoặc file ở ngoài thư mục runtime. Kiểm tra cả file chính lẫn `.bin` và ảnh đi kèm khi đóng gói. Đây là chính sách triển khai của bộ chuẩn, dựa trên cơ chế resource của [đặc tả glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).

## 2. Budget mặc định và cách điều chỉnh

Các con số dưới đây là **ngưỡng nội bộ khởi đầu cho web ưu tiên mobile**, không phải giới hạn của glTF hoặc cam kết chạy mượt. Quyết định cuối cùng phải dựa trên thiết bị và scene thật. `1 MiB = 1.048.576 byte`; không đổi lẫn với `1 MB = 1.000.000 byte`.

| Hạng mục | Ngưỡng khởi đầu | Cách xác nhận |
| --- | --- | --- |
| Một file trong thư mục runtime | Tối đa **5 MiB = 5.242.880 byte** | Checker đo byte trên đĩa, gồm cả file phụ |
| Toàn bộ các thư mục runtime khai báo | Tối đa **15 MiB = 15.728.640 byte** | Checker cộng tất cả file, không chỉ `.glb` |
| Tổng resource cho một model | Mục tiêu ≤ 5 MiB, gồm file chính và resource ngoài | Báo cáo bundle của model; tránh chia file để lách ngưỡng |
| Tải 3D ban đầu cho một trang | Mục tiêu ≤ 5 MiB resource chưa nén HTTP | Network + manifest, gồm decoder và environment map thực sự tải |
| Tam giác thực sự render trong một frame | Mục tiêu ≤ 100.000 cho mobile baseline | Đo scene đang chạy, gồm instance và các pass |
| Draw call trong một frame | Mục tiêu ≤ 100 cho mobile baseline | Đo tổng các pass, kể cả shadow/post-processing |
| Texture | Mặc định tối đa 2.048 × 2.048 mỗi ảnh | Inspect asset; texture lớn hơn phải có lý do và đo lại |
| Bộ nhớ texture ước tính của scene đang sống | Mục tiêu ≤ 64 MiB | Tính theo kích thước, format, mipmap, số texture; ghi cách ước tính |
| Chuyển động bình thường | Mục tiêu 60 FPS; p95 frame time ≤ 20 ms | Đo tương tác 30 giây sau warm-up trên thiết bị chuẩn |
| Mức chất lượng thấp | Tối thiểu 30 FPS; p95 frame time ≤ 33,3 ms | Giảm DPR/LOD/hiệu ứng; báo rõ chế độ được đo |
| Từ yêu cầu tải tới có thể tương tác với model | Mục tiêu ≤ 5 giây | Cold cache, cấu hình mạng thử nghiệm ghi trong báo cáo |

Nếu cần scene lớn, tạo profile riêng với lý do, thiết bị tối thiểu và số đo; cập nhật cấu hình checker cùng tài liệu trong cùng thay đổi. Có thể chia scene và tải theo nhu cầu, nhưng tổng runtime budget vẫn phải khớp profile được chọn. Không tăng ngưỡng chỉ để làm checker xanh.

File tải nhỏ chưa cho biết lượng RAM/GPU sau giải mã. Ví dụ texture RGBA8 không nén 2.048 × 2.048 cần khoảng 16 MiB cho level gốc; chuỗi mipmap đầy đủ cộng khoảng một phần ba nữa. Hãy đo hoặc ước tính theo format thực tế, thay vì lấy dung lượng JPEG/WebP làm bộ nhớ GPU.

## 3. Quy trình làm sạch và xuất

1. Chỉ chọn object/collection cần xuất. Loại mesh ẩn không dùng, geometry trùng không có chủ đích, material/texture không tham chiếu, camera/light thử nghiệm và animation thừa khỏi **bản xuất**. Giữ dữ liệu nguồn cần cho chỉnh sửa trong `art/`.
2. Kiểm tra scale, pivot, hướng, normals, UV, vùng trong suốt và tên object. Áp dụng transform hoặc modifier phù hợp quy trình; kiểm tra lại rig/animation sau mỗi thay đổi, không áp dụng hàng loạt khi chưa xem kết quả.
3. Giảm geometry theo kích thước xuất hiện trên màn hình. Dùng LOD cho vật thể xa, instancing cho vật thể lặp; gộp material/atlas khi phù hợp. Đừng gộp mesh đến mức mất culling hoặc phá animation.
4. Giảm kích thước texture trước, chỉ giữ map cần dùng. Kiểm tra màu, normal map, alpha và chất lượng sau nén. Cân nhắc KTX2/Basis khi loader, thiết bị và pipeline hỗ trợ.
5. Xuất glTF/GLB, inspect rồi tối ưu bản xuất. Chạy `dedup`/`prune` hoặc pipeline tương đương để loại resource trùng/không tham chiếu; lưu bản đầu vào riêng ngoài runtime. [glTF Transform](https://gltf-transform.dev/cli) cung cấp các thao tác này; phải xem lại hình ảnh và animation sau tối ưu.
6. Chạy [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator) trên bản cuối cùng, bật đọc resource phụ thuộc. Không còn error; warning phải được xử lý hoặc giải thích theo từng asset. Lưu report cùng artifact kiểm tra.
7. Mở bản build production và đo theo mục 5. Validator đạt không thay thế kiểm tra hình ảnh, hành vi hoặc tốc độ.

“Không có code thừa” áp dụng cả mã viewer: bỏ loader không dùng, import thừa, logic render lặp, listener không dọn và animation loop bị tạo nhiều lần. Dùng lint/typecheck/build và công cụ tìm unused export/dependency của dự án, kết hợp review. Checker byte không thể kết luận code hoặc geometry có còn cần thiết hay không.

Mỗi hàm trong viewer, loader, animation callback và phần dọn resource mặc định tối đa **60 dòng**, điều chỉnh bằng `code.maxFunctionLines` và kiểm tra qua lint. Quy tắc tính dòng và cách áp dụng cho mã xử lý nằm ở [kiểm tra chung](../quality/README.md#giới-hạn-dòng-của-hàm); giới hạn này áp dụng cho code, không áp dụng như số dòng đối với file model nhị phân.

## 4. Tích hợp runtime

- Chỉ tải model khi cần; trang dài dùng poster trước và tải khi vùng xem gần xuất hiện. Có trạng thái loading, lỗi, retry và ảnh/nội dung thay thế. Không khóa phần nội dung chính trong lúc giải mã model.
- Nếu dùng Draco, Meshopt hoặc KTX2, cấu hình decoder/transcoder tương ứng và đưa file cần thiết vào bản deploy. Khóa phiên bản theo dependency của dự án, kiểm tra tải cold cache để phát hiện decoder 404/CORS. Xem các API loader trong [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).
- Giới hạn device pixel ratio theo profile đã đo; giảm shadow, post-processing, số đèn và chất lượng texture khi cần. Dừng hoặc giảm render khi canvas không hiển thị; scene tĩnh ưu tiên render khi có thay đổi.
- Khi unmount/chuyển scene: dừng animation loop, bỏ event listener, dọn animation mixer và resource do viewer sở hữu. Với Three.js, dispose geometry/material/texture khi hết người dùng; resource dùng chung cần quản lý vòng đời để không dispose sớm. `remove()` khỏi scene chưa giải phóng resource GPU. Tham khảo [quy trình dispose của Three.js](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).
- Với tính năng quan trọng, kiểm tra context lost/không hỗ trợ WebGL và chế độ giảm chuyển động; vẫn phải đọc được nội dung hoặc dùng được luồng chính qua fallback.

## 5. Đo và nghiệm thu

Đo bản production trên ít nhất một điện thoại thuộc mức tối thiểu dự án và một máy desktop. Ghi đúng model thiết bị, hệ điều hành, trình duyệt, viewport, DPR, phiên bản build, cấu hình mạng và cache. Cấu hình desktop giả lập mobile không thay thế thử nghiệm điện thoại thật.

Với Three.js, `renderer.info.render.calls` và `renderer.info.render.triangles` hỗ trợ theo dõi lượng render; `renderer.info.memory` đếm geometry/texture, **không đo số byte GPU**. Nếu một frame có nhiều pass, thu thập số liệu cho cả frame và quản lý `autoReset`/`reset` tương ứng. Xem [WebGLRenderer.info](https://threejs.org/docs/pages/WebGLRenderer). Thời gian frame phải đo riêng; số draw call thấp không chứng minh FPS đạt mục tiêu.

- Tải cold cache ít nhất 3 lần; báo median thời gian ready và transfer/resource size riêng. Ghi bước tính “ready”, ví dụ đã render frame đầu và nhận được thao tác xoay.
- Đo 30 giây tương tác sau warm-up: xoay, zoom, animation, góc nhìn nặng nhất; ghi FPS và p95 frame time. Không lấy chỉ số chỉ khi camera đứng yên.
- Mở/đóng viewer hoặc đổi model ít nhất 10 lần. So sánh số resource sau khi trở lại cùng trạng thái; điều tra mức tăng liên tục. Một số resource nội bộ engine còn được cache nên không yêu cầu mọi bộ đếm về 0.
- Kiểm tra network/console không có resource lỗi; xem toàn bộ animation và material sau nén, trên cả profile thấp.

Checker đi kèm kiểm tra đường dẫn, file nguồn lọt vào runtime, dung lượng, cấu trúc GLB cơ bản và resource glTF có thể đọc được. **Checker không thay thế Khronos Validator và không tự đo triangles, draw calls, texture dimensions, bộ nhớ, FPS hoặc code thừa.** Tích hợp thêm validator và công cụ kiểm tra mã vào các lệnh quality của dự án.

## 6. Checklist trước khi bàn giao

- [ ] Nguồn nằm trong `art/`; runtime chỉ có bản xuất và resource cần dùng.
- [ ] Có nguồn gốc/quyền sử dụng, người phụ trách và mapping từ nguồn đến bản xuất.
- [ ] Không còn resource thừa sau review và tối ưu; lint/typecheck/build của viewer đạt.
- [ ] Checker dung lượng/cấu trúc đạt; bundle của mỗi model không lách ngưỡng bằng resource ngoài.
- [ ] Khronos Validator không có error; warning được giải thích nếu còn.
- [ ] Đúng scale, pivot, UV, vật liệu, transparency, rig và animation.
- [ ] Decoder và mọi dependency tải được từ bản deploy, cold cache.
- [ ] Có poster/fallback, loading/error/retry và hành vi giảm chuyển động phù hợp.
- [ ] Profile mobile đạt các mục tiêu đã chọn; báo cáo có thiết bị và số đo.
- [ ] Vòng đời scene được dọn; thử đổi model nhiều lần không tăng resource không kiểm soát.

## 7. Mẫu báo cáo của dự án

Copy phần này vào `docs/3d/performance-report.md` của dự án dùng 3D; thay placeholder bằng dữ liệu thật trước khi nghiệm thu.

```text
Build/commit: <commit>
Asset và nguồn: <runtime path> <- <art path>
Người phụ trách / quyền sử dụng: <tên, license>
Profile và ngoại lệ đã duyệt: <mobile baseline hoặc profile riêng, lý do>
Thiết bị / OS / trình duyệt: <model, phiên bản>
Viewport / DPR / chế độ chất lượng: <giá trị>
Mạng / cache: <thông lượng, latency, cold hoặc warm>
Model bundle bytes / tổng runtime bytes: <byte, gồm phụ thuộc>
Validator: <phiên bản, errors, warnings, đường dẫn report>
Ready median qua 3 lần cold load: <ms, định nghĩa ready>
Kịch bản tương tác và thời lượng: <xoay/zoom/animation, 30 giây>
FPS / p95 frame time: <giá trị và phương pháp đo>
Peak triangles / draw calls mỗi frame: <toàn bộ pass>
Texture lớn nhất / texture memory ước tính: <kích thước, format, mipmap, MiB>
Resource trước/sau 10 lần đổi model: <geometry, texture; nhận xét>
Kết quả hình ảnh, fallback, lỗi network: <đạt hoặc vấn đề còn lại>
Kết luận và người nghiệm thu: <đạt/chưa đạt, ngày, tên>
```
