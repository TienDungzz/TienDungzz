# Kiểm tra dự án

## Công cụ và lệnh chạy

Bộ checker kiểm tra tĩnh dùng Node.js và không cần dependency ngoài. Mỗi phần có script và logic riêng, còn `check-project.mjs` điều phối kiểm tra tổng. Repo này dùng Node.js 22.13+ thuộc nhánh 22 hoặc Node.js 24+ và ESLint cho quality gate `lint`; chạy `npm ci` trước khi kiểm tra đầy đủ. Checker không sửa hoặc xóa source/asset. Các quality command của dự án có thể tạo output như build/coverage theo cấu hình công cụ của dự án.

```sh
# Kiểm tra tĩnh; quality commands được ghi rõ chưa chạy
node scripts/check-project.mjs

# Kiểm tra tĩnh và thực thi mọi quality command đã cấu hình
node scripts/check-project.mjs --run

# Chạy từ repo chuẩn đối với một dự án khác
node scripts/check-project.mjs --root ../du-an-khac --run

# Cấu hình khác, đường dẫn tương đối với root dự án đích
node scripts/check-project.mjs --config project-standards.ci.json --run --json
```

`--json` xuất một JSON report gồm `status`, `results` và `exitCode`; output quality command được giữ trong trường `output`. Nếu lưu report, đặt ngoài vùng docs/assets được scan để report không tự làm tăng dung lượng asset.

| Exit code | Ý nghĩa |
| --- | --- |
| 0 | Không phát hiện lỗi trong phần đã chạy; nếu thiếu `--run`, status có thể là `incomplete` |
| 1 | Có lỗi kiểm tra hoặc quality command thất bại |
| 2 | Tham số CLI, đọc file cấu hình hoặc định dạng cấu hình không hợp lệ |

CI phải dùng `--run`; chỉ chấp nhận `status: passed` khi phát hành. `skip` cho phạm vi không áp dụng khác với quality gate chưa chạy. Các gate chạy tuần tự tại root dự án đích và giữ nguyên mã nguồn. Checker tiếp tục các gate còn lại sau một lỗi để có báo cáo đầy đủ.

## Các checker độc lập

| Script | Lệnh npm | Phần được kiểm tra |
| --- | --- | --- |
| [check-config.mjs](../../scripts/check-config.mjs) | `npm run check:config` | Định dạng và kiểu dữ liệu của toàn bộ cấu hình; không chạy command |
| [check-docs.mjs](../../scripts/check-docs.mjs) | `npm run check:docs` | Tài liệu bắt buộc và liên kết Markdown nội bộ |
| [check-structure.mjs](../../scripts/check-structure.mjs) | `npm run check:structure` | Thành phần có triển khai theo scope, hỗ trợ `--scope` |
| [check-assets.mjs](../../scripts/check-assets.mjs) | `npm run check:assets` | Runtime 3D, ngân sách byte, GLB/glTF và dependency |
| [check-quality.mjs](../../scripts/check-quality.mjs) | `npm run check:quality` | Các command đã khai báo; lệnh npm này có `--run`, hỗ trợ `--gate` |
| [check-project.mjs](../../scripts/check-project.mjs) | `npm run check` | Điều phối tất cả nhóm và chạy quality gates |

`npm run check:static` chạy bộ điều phối không có `--run`, nên chỉ ghi nhận các quality command chưa thực thi. `npm run lint` kiểm tra mã JavaScript và giới hạn độ dài hàm riêng bằng ESLint.

Các checker con đọc thông tin `version`/`project` chung và kiểm tra nhóm cấu hình liên quan: docs dùng `documentation`, cấu trúc dùng `structure`, asset dùng `assets`, quality dùng `quality` và `code`. Nhờ vậy, lỗi cấu hình asset không chặn việc chạy riêng phần docs. `check-config.mjs` kiểm tra toàn bộ cấu hình; bộ điều phối kiểm tra các nhóm tương ứng với checker được chọn và có file.

Chọn các checker mà bộ điều phối sẽ dùng trong `project-standards.json`:

```json
{
  "checks": ["docs", "structure", "assets", "quality"]
}
```

- `docs`, `structure`, `assets`, `quality` ánh xạ tới các file `check-*.mjs` trong bảng trên. Bỏ một tên khỏi danh sách để không nạp hoặc chạy checker đó.
- Với mỗi checker được chọn: **có file thì chạy, không có file thì báo `SKIP`** và tiếp tục phần còn lại. File được tìm cạnh `check-project.mjs`, không phải tự tìm script trong thư mục dự án đích của `--root`.
- Không khai báo `checks` thì mặc định chọn cả bốn nhóm. `checks: []` bỏ qua toàn bộ nhóm; report ghi rõ từng mục bỏ qua, không có nghĩa là dự án đã được kiểm chứng.
- Tên sai, tên trùng hoặc kiểu dữ liệu không hợp lệ là lỗi cấu hình. File có mặt nhưng sai cú pháp, thiếu export/dependency hoặc xử lý thất bại vẫn báo lỗi; không biến các lỗi đó thành `SKIP`.

Danh sách ánh xạ nằm trong `scripts/lib/registry.mjs`; loader nạp checker được chọn khi cần. Các module checker phải đồng bộ, không dùng top-level `await`, theo cơ chế [Node.js nạp ESM qua require](https://nodejs.org/docs/latest-v22.x/api/modules.html#loading-ecmascript-modules-using-require). Thư viện dùng chung `scripts/lib/` vẫn là thành phần bắt buộc.

```text
scripts/
├── check-project.mjs        # Chỉ điều phối các nhóm kiểm tra
├── check-config.mjs
├── check-docs.mjs
├── check-structure.mjs
├── check-assets.mjs
├── check-quality.mjs
├── lib/
│   ├── config.mjs           # Validate cấu hình theo nhóm
│   ├── context.mjs          # Đọc cấu hình, thu kết quả và tạo report
│   ├── cli.mjs              # Parse tham số, help, JSON và exit code
│   ├── registry.mjs         # Tên, file và nhóm cấu hình của checker
│   ├── loader.mjs           # Nạp checker đã chọn, bỏ qua file không có
│   └── utils.mjs            # Kiểm tra đường dẫn, filesystem và kiểu dữ liệu
```

Các file kiểm thử của repo nằm riêng trong `tests/`:

```text
tests/
├── check-project.test.mjs   # Regression của bộ điều phối
├── check-parts.test.mjs     # Checker độc lập, lựa chọn và nạp file tùy chọn
└── function-length.test.mjs # Quy tắc lint và giới hạn dòng hàm
```

Mỗi script nhận `--root`, `--config`, `--json` và `--help`. Chạy từ repo chuẩn để chọn một phần của dự án đích:

```sh
# Chỉ kiểm tra docs
node scripts/check-docs.mjs --root ../du-an-khac --json

# Scope phải trùng tên trong structure[]; có thể lặp --scope
node scripts/check-structure.mjs --root ../du-an-khac --scope frontend
node scripts/check-structure.mjs --root ../du-an-khac --scope backend --scope backend-verification

# Chỉ chạy gate đã được dự án đích cài đặt và khai báo
node scripts/check-quality.mjs --root ../du-an-khac --gate security-tests --gate dependency-audit --run
node scripts/check-quality.mjs --root ../du-an-khac --gate load --run
```

Không truyền `--scope`/`--gate` thì checker tương ứng xét toàn bộ scope/gate. Tên không tồn tại trả lỗi thay vì bỏ qua âm thầm. Scope rỗng hoặc tắt được báo không áp dụng; không tự suy ra một scope chưa khai báo. Chạy trực tiếp `check-quality.mjs` không có `--run` vẫn là dry run và báo `incomplete` nếu có command chưa chạy.

`passed` của một checker con chỉ áp dụng cho phần đã chọn. CI phát hành phải dùng bộ kiểm tra tổng hoặc bao phủ đầy đủ các checker/gate bằng các job tương đương. Không lấy kết quả docs hoặc một gate để kết luận mọi phần đều đạt.

Repository này đặt script thực thi trong `scripts/`, thư viện nội bộ trong `scripts/lib/`, kiểm thử trong `tests/`. Cấu hình `structure` khai báo các đường dẫn này để kiểm tra chính bộ quy chuẩn. Các file trong `tests/` vẫn phải qua lint và giới hạn dòng hàm.

Khi áp dụng sang dự án khác, chép các checker cần dùng cùng toàn bộ `scripts/lib/`; một file entry point riêng lẻ không chứa đủ phần triển khai. Có thể chép cả thư mục `scripts/` rồi chọn bằng `checks`. Nếu cần chạy bộ kiểm thử của checker tại dự án đích thì chép thêm `tests/`. Thay `structure` và các command bằng đường dẫn/lệnh của dự án đích, chuẩn bị dependency như hướng dẫn bên dưới.

## Khai báo cấu hình

Xem [cấu hình repo tài liệu](../../project-standards.json) và [ví dụ fullstack có 3D, API cần xác thực và chống lạm dụng](../../examples/project-standards.fullstack.json). Ví dụ cần chỉnh trước khi dùng: feature `users`, thư mục và npm script đều là minh họa, không phải scaffold đã được tạo. Bật/tắt thành phần theo use case, ánh xạ theo framework hoặc dịch vụ managed tương đương; cấu trúc mẫu không bắt mọi dự án cài Redis, queue hoặc một nền tảng edge cụ thể.

| Trường | Quy tắc |
| --- | --- |
| `version` | Số `1`, phiên bản định dạng checker |
| `project.name`, `project.kind` | Chuỗi không rỗng; kind mô tả loại dự án, không tự suy ra đường dẫn hoặc gate |
| `checks` | Tùy chọn; mảng tên duy nhất trong `docs`, `structure`, `assets`, `quality`. Bộ điều phối chạy file được chọn nếu có, thiếu file thì `SKIP` |
| `documentation.required` | Các file tài liệu bắt buộc, phải tồn tại và không rỗng |
| `documentation.scan` | File/thư mục để tìm `.md` và kiểm tra liên kết nội bộ |
| `structure` | Mảng phạm vi; repo tài liệu có thể dùng `[]` |
| `structure[].enabled` | Boolean; phạm vi tắt cần `reason` không rỗng |
| `structure[].root` | Thư mục gốc của phạm vi đã bật |
| `components[].name` | Tên duy nhất trong phạm vi |
| `components[].paths` | Một hoặc nhiều đường dẫn thay thế cụ thể, tương đối với scope root; không hỗ trợ glob |
| `components[].required` | `true` khi dùng; `false` cho thành phần chưa dùng. Nếu có đường dẫn nhưng chỉ là placeholder vẫn lỗi |
| `code.maxFunctionLines` | Số nguyên dương an toàn, mặc định `60` nếu bỏ trống; công cụ lint của dự án phải đọc hoặc đồng bộ cùng giá trị |
| `quality.required` | Tên gate bắt buộc phải có trong `quality.commands` |
| `quality.commands` | Object `tên: "shell command"`; tất cả command đều chạy khi có `--run` |
| `assets.enabled` | Boolean; tắt cần `reason`; bật cần tất cả cấu hình budget bên dưới |
| `assets.roots` | Các thư mục runtime; phải tồn tại, tổng hợp phải có file |
| `assets.maxFileBytes` | Số byte dương tối đa cho từng file trong runtime |
| `assets.maxTotalBytes` | Số byte dương tối đa cho toàn bộ file runtime, các root chồng nhau không đếm trùng |
| `assets.allowedExtensions` | Danh sách đuôi file runtime được phép, có dấu chấm và dùng chữ thường |
| `assets.forbiddenExtensions` | Danh sách cấm bổ sung; native source `.blend`, `.blend1`, `.fbx`, `.obj`, `.psd`, `.max`, `.ma`, `.mb` luôn bị cấm trong runtime |

Đường dẫn cấu hình là tương đối, không được thoát khỏi root, không dùng symlink. Component có thể là thư mục hoặc file theo convention của framework. Checker cần ít nhất một file có nội dung khác `README.md`, `.gitkeep`, `.keep`; không phân tích file đó có triển khai đúng nghiệp vụ hay không. `paths` là các lựa chọn **hoặc**; muốn bắt buộc hai thành phần thì khai báo hai component riêng. Muốn kiểm tra mọi feature thì khai báo từng feature hoặc thêm công cụ kiến trúc phù hợp.

Khi không dùng một phạm vi, khai báo rõ:

```json
{
  "name": "backend",
  "enabled": false,
  "reason": "Ứng dụng frontend gọi API do dịch vụ khác quản lý."
}
```

Khi dùng hooks, helpers hoặc gateway, đổi mục tương ứng thành `required: true` và ánh xạ đường dẫn thật, kể cả khi nằm trong feature. Không để `false` để bỏ qua một thành phần đang dùng. Quyết định không áp dụng và ngoại lệ phải có trong [hồ sơ dự án](../templates/project.md).

## Giới hạn dòng của hàm

Mỗi function, method, arrow function, callback, hàm async và IIFE mặc định **không vượt quá 60 dòng**. Đếm từ dòng bắt đầu khai báo hàm tới dòng kết thúc hàm, gồm cả hai dòng biên, dòng trống và comment. Dòng của hàm lồng nhau vẫn thuộc tổng dòng của hàm bao ngoài. Hàm component có JSX cũng được tính; parser và phạm vi lint phải bao phủ đúng source thực tế.

Giới hạn là tham số của dự án trong `project-standards.json`:

```json
{
  "code": {
    "maxFunctionLines": 60
  }
}
```

Có thể đổi `60` thành số nguyên dương phù hợp với dự án. Khi điều chỉnh, ghi lý do và giá trị được chọn trong hồ sơ dự án, cập nhật công cụ kiểm tra và chạy lại quality gates. Ngoại lệ riêng cho file hoặc convention framework phải có phạm vi và quyết định được review; không tắt rule đại trà để bỏ qua lỗi.

Với JavaScript trong repo này, [cấu hình ESLint](../../eslint.config.mjs) đọc `code.maxFunctionLines`, mặc định `60`, và dùng [rule `max-lines-per-function`](https://eslint.org/docs/latest/rules/max-lines-per-function) ở mức lỗi với các tùy chọn tương đương:

```js
'max-lines-per-function': ['error', {
  max: maxFunctionLines,
  skipBlankLines: false,
  skipComments: false,
  IIFEs: true
}]
```

Chạy `npm run lint` để kiểm tra riêng hoặc `npm run check` để chạy toàn bộ gate. Khi dùng checker với `--config`, checker truyền đường dẫn cấu hình đã chọn qua biến `PROJECT_STANDARDS_CONFIG` cho các lệnh con; cấu hình ESLint của repo đọc đường dẫn này để dùng đúng giới hạn. Lint độc lập mặc định đọc `project-standards.json` cạnh `eslint.config.mjs`.

Rule áp dụng cho cả mã kiểm tra; không dùng comment disable để giữ hàm quá dài. Repo khác cần ghép rule vào cấu hình lint sẵn có, chọn parser phù hợp với TypeScript/Vue và bao phủ mọi package được phát hành. Với ngôn ngữ khác, dùng công cụ phân tích cú pháp tương ứng và nối vào `quality.commands`. Chỉ chép checker hoặc khai báo con số trong JSON chưa thực thi được quy tắc độ dài hàm.

Mục tiêu là mỗi hàm đảm nhiệm một công việc rõ ràng, tách validation, chuyển đổi và điều phối khi có ranh giới hợp lý, đồng thời dùng lại phần xử lý trùng. Không ép nhiều câu lệnh lên một dòng, bỏ comment hữu ích hoặc tách các hàm không có ý nghĩa để đạt số dòng. Hàm ngắn vẫn có thể trùng logic; review và công cụ tìm duplication là bước bổ sung khi cần.

## Quality gates của dự án thật

| Gate | Yêu cầu |
| --- | --- |
| `lint` | Kiểm tra ngôn ngữ/framework, giới hạn dòng hàm theo `code.maxFunctionLines`; cấu hình unused imports/variables và cấm suppression đại trà |
| `typecheck` | Với stack có kiểm tra kiểu; dự án không dùng phải ghi lý do và bỏ khỏi danh sách required |
| `test` | Unit/integration/e2e theo rủi ro; chế độ CI kết thúc, không dùng watch mode |
| `build` | Build production, bao phủ mọi package được phát hành |
| `unused` | Tìm file/export/dependency không dùng, kiểm tra entry point động và review asset/code trước khi xóa |
| `gltf` | Nếu có 3D: dùng Khronos glTF Validator, tổng hợp mọi model và trả nonzero khi validation lỗi |
| `security-tests` | Test từ chối truy cập sai role/object/tenant, input không hợp lệ và chống lạm dụng theo chức năng |
| `dependency-audit` | Kiểm tra advisories của dependencies và build tools; pin công cụ, ghi phạm vi và mức chặn |
| `secret-scan` | Phát hiện credential/private key trong phạm vi được scan; secret thật phải thu hồi/rotation, không chỉ xóa file |
| `sast` | Phân tích bảo mật theo ngôn ngữ/framework; findings cần được đánh giá và xử lý theo policy |
| `load` | Smoke test tải có ngưỡng máy kiểm được, báo cả lỗi bất ngờ và request bị từ chối; benchmark dài có workflow riêng |

Đây là trách nhiệm tối thiểu khi có phạm vi tương ứng; checker chỉ biết danh sách mà dự án khai báo. Không tự cài công cụ hoặc thêm npm script giả. Với monorepo, lệnh tại root phải bao phủ các workspace liên quan hoặc khai báo gate riêng theo package.

`--run` thực thi các chuỗi lệnh trong cấu hình bằng shell của hệ điều hành. Chỉ dùng với cấu hình/repo đã tin cậy; không truyền dữ liệu người dùng hoặc secret vào chuỗi command. Cách này hỗ trợ npm/pnpm/yarn và công cụ ngôn ngữ khác, kể cả npm `.cmd` trên Windows. Xem [tài liệu child_process của Node.js](https://nodejs.org/api/child_process.html). Mỗi lệnh có timeout 5 phút và giới hạn output 16 MiB; vượt giới hạn sẽ thất bại, cần chia nhỏ lệnh hoặc chạy bước dài ở CI riêng.

Không khai báo quality command gọi lại `check-project.mjs --run`, `check-quality.mjs --run` hoặc alias npm tương ứng nếu sẽ chạy lại chính gate đó, gây đệ quy. Trong repo chuẩn, gate `test` chạy trực tiếp Node test runner; khi chép sang dự án khác phải thay lệnh này bằng lệnh kiểm tra của dự án đó, hoặc giữ bộ test nếu muốn kiểm tra checker tại dự án đích.

## Bảo mật và chịu tải trong CI

Áp dụng [quy chuẩn bảo mật](../security/README.md), [quy chuẩn chịu tải](../backend/reliability.md) và giữ bằng chứng trong [hồ sơ bảo mật](../templates/security.md), [hồ sơ năng lực](../templates/capacity.md). Với backend công khai, phải xác định các gate tương ứng; điều không áp dụng cần lý do theo chức năng, không chỉ vì chưa cài công cụ.

- Các tên gate trong ví dụ chỉ là hợp đồng. Dự án đích phải cài/cấu hình công cụ, tạo npm scripts thật, chuẩn bị môi trường test và điền ngưỡng trước khi chạy. Repo tài liệu hiện không có API để thực thi các bài thử bảo mật hay tải của ứng dụng.
- Với ví dụ Node.js, `npm audit --audit-level=high` là một bước kiểm tra advisories, không thay cho secret scan, SAST, authorization test hoặc kiểm tra cấu hình triển khai. Chọn công cụ tương ứng cho các hệ sinh thái khác và dependency của container/OS nếu sử dụng.
- Findings được phân loại theo tác động và khả năng ảnh hưởng. Policy mẫu chặn findings High/Critical chưa xử lý hoặc secret đã xác nhận; mức chặn thực tế ghi trong hồ sơ. Ngoại lệ phải có rule/advisory, phạm vi, lý do, người duyệt và ngày hết hạn; không bỏ qua toàn bộ scanner hoặc coi mức thấp hơn là tự an toàn.
- Tool lỗi, thiếu database advisory, không quét được source cần thiết hoặc không kết nối được môi trường phải báo lỗi/chưa hoàn tất. Không dùng `|| true`, report rỗng hoặc suppression rộng để trả thành công.
- Load test ghi rõ target thuộc môi trường đã cho phép thử, dataset và giới hạn dừng. Không tự gửi tải vào production hoặc dịch vụ bên thứ ba. Ghi cả offered/achieved load, p95/p99, tỷ lệ request hợp lệ thành công, 429/503, số liệu pool/queue và thời gian phục hồi; tránh làm đẹp latency bằng cách chỉ đo request được nhận.
- Gate `load` trong ví dụ chạy bài thử CI ngắn, dưới timeout 5 phút của checker. Sustained/burst/soak dài và thử lỗi phụ thuộc chạy ở workflow có timeout, target và cơ chế dừng riêng; lưu kết quả gắn đúng commit/profile. Không dùng lệnh chỉ đọc report cũ rồi luôn trả mã 0 để thay cho bài thử.

Test runner phải trả nonzero khi sai policy hoặc vượt ngưỡng. Ví dụ một công cụ tải có thể dùng thresholds để quyết định pass/fail như [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/); ngưỡng do dự án chốt sau khi đo, không lấy số mẫu làm cam kết sức chịu tải.

Checker chỉ kiểm tra những component và command đã khai báo. Việc có thư mục `security/`, lệnh scanner trả 0 hoặc rate limiter hoạt động trên một replica chưa chứng minh ứng dụng an toàn, đáp ứng tải mục tiêu hoặc chống được DDoS. Kiểm chứng runtime, multi-replica, edge/origin và phục hồi là phần bắt buộc của hồ sơ nghiệm thu theo phạm vi.

## Checker kiểm tra được gì?

| Tự động trong script | Cần công cụ khác / review |
| --- | --- |
| Cấu hình, file docs và thành phần có nội dung | Tính hợp lý của kiến trúc, hướng phụ thuộc, nội dung code |
| Giá trị `code.maxFunctionLines` hợp lệ; gate `lint` thực thi rule độ dài hàm khi được cấu hình và chạy | Mức phù hợp của trách nhiệm hàm, logic trùng lặp và source nằm ngoài phạm vi/parser lint |
| File đích của Markdown inline links/images và reference definitions | URL ngoài, anchor heading, HTML/MDX links, cú pháp Markdown đầy đủ |
| Byte/file và tổng mọi file runtime | Tổng tải thực tế mỗi scene, giải mã, GPU memory, FPS |
| Extension được phép và file nguồn bị cấm trong runtime | File đổi sai đuôi, quyền sử dụng, asset/mesh/material không dùng |
| GLB magic/version/length/chunks/JSON; glTF asset version 2.0 | Toàn bộ semantic glTF/accessor/scene/extension và decoder tương thích |
| URI chuẩn `buffers`/`images` local có file trong runtime roots; external buffer không ngắn hơn byteLength nếu được khai báo là số nguyên | URI do extension tùy biến, semantic data URI, texture dimensions, thuộc tính mesh |
| Exit code/output của command đã chạy | Chất lượng và độ bao phủ của command được khai báo |

Markdown bỏ qua fenced code và inline code; đây là bộ dò liên kết nhẹ, không phải Markdown parser. Thư mục generated như `.git`, `node_modules`, `dist`, `build`, `coverage`, `.next`, `.nuxt` bị bỏ qua khi scan docs/component. **Asset scan không bỏ qua chúng** để không bỏ lọt file runtime. Các đường dẫn phải đúng chữ hoa/chữ thường để chạy CI Linux; máy Windows có thể không phát hiện khác biệt chữ hoa/chữ thường.

URI HTTP/HTTPS và URI ra ngoài runtime roots bị từ chối trong `buffers`/`images` để budget không bỏ sót dependency tải ngoài. Data URI được giữ bên trong file và tính trong byte của file; checker không giải mã hoặc validate semantic. Những giới hạn này là policy bộ chuẩn, không phải toàn bộ giới hạn của [định dạng glTF](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).

## Tích hợp CI và bàn giao

1. Checkout dự án và chuẩn bị đúng runtime/công cụ được pin trong dự án.
2. Cài dependencies bằng lockfile, khởi động dịch vụ test cần thiết và thiết lập env của CI.
3. Chạy `node scripts/check-project.mjs --run`; giữ exit code khi dùng pipeline hoặc wrapper.
4. Lưu report/artifact, bổ sung các phép đo thủ công theo [mẫu review](../templates/review.md). Không đánh dấu FPS, accessibility hoặc dead code đã đạt chỉ vì checker trả thành công.

Repo chuẩn có [workflow GitHub Actions](../../.github/workflows/check.yml) để cài dependencies bằng lockfile rồi chạy checker, lint và test trên Windows/Linux khi push hoặc mở pull request, dùng [checkout](https://github.com/actions/checkout) và [setup-node](https://github.com/actions/setup-node). Khi áp dụng vào ứng dụng thật phải bổ sung dịch vụ và env phù hợp.

Repo chuẩn có thể tự kiểm tra bằng `npm run check` hoặc lệnh Node ở trên. Sửa checker hoặc quy tắc lint thì chạy `npm test`, gồm regression của bộ điều phối, fixture từng checker độc lập, lựa chọn scope/gate, cấu trúc, links, command, ngân sách 3D và giới hạn dòng hàm.
