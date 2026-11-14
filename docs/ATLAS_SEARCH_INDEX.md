# Hướng Dẫn Cấu Hình MongoDB Atlas Search Index (Story 4.1)

Hệ thống đã hỗ trợ cơ chế **Dual Engine**:
1. Tự động dùng pipeline `$search` của MongoDB Atlas nếu Index đã được tạo trên Atlas Web UI.
2. Tự động Fallback an toàn sang **Slang Expander & Diacritic Regex** tích hợp sẵn trong mã nguồn Node.js (luôn hoạt động ổn định và chính xác ngay cả khi chưa tạo Index trên Atlas).

---

## Các Bước Tạo Atlas Search Index trên Web MongoDB Atlas (Mất 1 phút)

1. Đăng nhập vào [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Chọn Cluster của bạn $\rightarrow$ Chọn tab **Atlas Search**.
3. Bấm nút **Create Search Index** $\rightarrow$ Chọn **JSON Editor** $\rightarrow$ Bấm **Next**.
4. Chọn Database: `apartment_sale`, Collection: `apartments`.
5. Đặt **Index Name**: `default`.
6. Dán đoạn JSON cấu hình dưới đây vào khung cấu hình:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.vietnamese",
        "multi": {
          "keyword": {
            "type": "string",
            "analyzer": "lucene.standard"
          }
        }
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.vietnamese"
      },
      "location": {
        "fields": {
          "address": {
            "type": "string",
            "analyzer": "lucene.vietnamese"
          },
          "district": {
            "type": "string",
            "analyzer": "lucene.vietnamese"
          }
        },
        "type": "document"
      }
    }
  }
}
```

7. Bấm nút **Create Search Index**. Chờ khoảng 10-30 giây để Atlas hoàn thành xây dựng chỉ mục.

