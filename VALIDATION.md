# Validation — MarketScope V0.2.0

Các kiểm tra đã thực hiện trước khi đóng gói:

- TS/TSX syntax parse: pass.
- Local semantic type check với external-module stubs: pass.
- Indicator engine smoke tests cho xu hướng tăng / giảm / range: pass.
- JSON / manifest parse: pass.
- Local import resolution: pass.
- Không có `output: "export"` và không cấu hình `out`: pass.
- `.env.example` không chứa SSI credentials thật: pass.
- Entry / SL / TP chỉ được nhắc là roadmap V0.3.0, chưa được implement ở V0.2.0.

## Giới hạn môi trường kiểm thử

`npm install` production dependency bị timeout khi kết nối npm registry trong môi trường đóng gói, nên không thể hoàn tất `next build` tại đây. Khi deploy, Vercel sẽ chạy install/build trong hạ tầng của Vercel. Source vẫn giữ cấu hình Next.js tiêu chuẩn và `Output Directory` phải để trống.
