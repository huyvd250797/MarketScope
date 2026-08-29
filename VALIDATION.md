# Validation — MarketScope V0.7.0

Checklist cần pass trước deploy:

- Package version `0.7.0`.
- Service Worker cache `marketscope-shell-v0.7.0`.
- Không có `output: "export"`.
- Vercel Output Directory để trống.
- SavedPosition cũ không có quantity vẫn đọc được với mặc định 1.
- Portfolio không cộng trực tiếp VND với USD/USDT.
- Portfolio API giới hạn 30 vị thế và concurrency 3.
- Entry price / quantity > 0 mới được lưu.
- Risk status không biến thành khuyến nghị chắc chắn mua/bán.
- Futures/SHORT/leverage không có trong V0.7.0.
- Không có secret thật trong source.
- ZIP phải qua `unzip -t`.

Lưu ý môi trường đóng gói có thể không truy cập npm registry. Nếu `npm install` không khả dụng, cần chạy `npm install && npm run typecheck && npm run build` trên máy local/GitHub/Vercel trước production.
