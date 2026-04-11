# HỆ THỐNG MÔ PHỎNG SÀN GIAO DỊCH UED (Trading Platform Simulation)

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)
Dự án "Siêu Sàn Giao Dịch UED" là một hệ thống ứng dụng Web (Web Application) được xây dựng nhằm mô phỏng lại toàn bộ quy trình cốt lõi của một sàn giao dịch tài chính thời gian thực. Hệ thống không chỉ tập trung vào trải nghiệm người dùng (UI/UX) mà còn đi sâu vào việc giải quyết các bài toán hóc búa ở phía Server như: xử lý dữ liệu tần suất cao (High-Frequency Data), cân bằng tải (Load Balancing), và phân tán dịch vụ (Microservices architecture).

## 2. CƠ SỞ LÝ THUYẾT & KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Dự án được thiết kế thoát khỏi lối mòn của kiến trúc Đơn nguyên (Monolithic) truyền thống, chuyển dịch sang mô hình phân tán cơ bản để đảm bảo tính Sẵn sàng cao (High Availability) và Khả năng mở rộng (Scalability).

### 2.1. Cân Bằng Tải Với Nginx (Load Balancing)
Thay vì để một máy chủ Node.js duy nhất gánh toàn bộ lượng truy cập, hệ thống triển khai **Nginx** đóng vai trò là một Reverse Proxy (Proxy ngược) và Load Balancer (Bộ cân bằng tải) đứng ở tuyến đầu (Port 80).
* **Thuật toán điều phối:** Nginx được cấu hình sử dụng thuật toán **Round Robin** (Luân chuyển vòng). Các luồng request từ người dùng sẽ được chia đều đặn cho cụm 3 máy chủ Backend (Node 1, Node 2, Node 3). Điều này triệt tiêu hoàn toàn hiện tượng "thắt cổ chai" (Bottleneck) khi lượng truy cập tăng đột biến.
* **Bảo mật:** Nginx che giấu hoàn toàn IP và cấu trúc nội bộ của cụm Backend, tạo thành một lớp khiên bảo vệ (Shield) chống lại các cuộc tấn công khai thác lỗ hổng trực tiếp.

### 2.2. Xử lý Dữ liệu Thời gian thực (Real-time Data Processing)
Trong lĩnh vực tài chính, giá cả biến động theo từng mili-giây. Dự án giải quyết bài toán này thông qua cơ chế Polling kết hợp RESTful API liên tục gọi đến nền tảng Binance.
* Backend Node.js đóng vai trò như một Middleware, xử lý thô và tối ưu hóa cấu trúc JSON trước khi đẩy về Client. Việc này giúp giảm tải băng thông mạng và tránh các lỗi bảo mật Cross-Origin Resource Sharing (CORS) khi trình duyệt phải gọi trực tiếp đến API quốc tế.
* Biểu đồ nến Nhật (Klines) được render mượt mà nhờ thư viện Lightweight Charts, đảm bảo tốc độ khung hình cao (60fps) ngay cả khi dữ liệu thay đổi liên tục.

### 2.3. Quản trị Trạng thái và Cơ sở dữ liệu (State & Persistence)
Dự án áp dụng chiến lược lưu trữ kép, phục vụ cho các kịch bản khác nhau:
* **In-Memory Storage (Lưu trên RAM):** Engine khớp lệnh (Matching Engine) tính toán Lãi/Lỗ (PnL), Đòn bẩy (Margin/Leverage) và tự động kích hoạt Cắt lỗ/Chốt lời (SL/TP) hoàn toàn trên bộ nhớ RAM. Điều này mang lại tốc độ truy xuất O(1), không có độ trễ đọc ghi ổ cứng, mô phỏng chính xác tốc độ của một sàn giao dịch thực tế.
* **Relational Database (MySQL 8.0):** Để đảm bảo tính toàn vẹn dữ liệu (ACID), các giao dịch sau khi đóng (Close Position) sẽ được đồng bộ hóa và lưu trữ vĩnh viễn vào hệ cơ sở dữ liệu quan hệ MySQL, phục vụ cho việc truy xuất tại Trang Quản trị (Admin Dashboard).

---

## 3. CÔNG NGHỆ SỬ DỤNG (TECH STACK)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Lightweight Charts (by TradingView).
* **Backend:** Node.js, Express.js framework, Axios.
* **Database:** MySQL 8.0.
* **DevOps & Deployment:** Nginx (Reverse Proxy), Docker, Docker Compose (Containerization).

---

## 4. CẤU TRÚC PHIÊN BẢN TRIỂN KHAI
Dự án được module hóa thành 3 phiên bản để chứng minh các khía cạnh kỹ thuật khác nhau:

Một web sàn mô tả giao dịch giá vàng trên thị trường 
---

## 5. HƯỚNG DẪN TRIỂN KHAI (DEPLOYMENT)

### Yêu cầu môi trường
* Hệ điều hành: Linux (Ubuntu/CentOS) hoặc Windows/macOS có cài đặt Docker Desktop.
* Phần mềm: Docker Engine & Docker Compose.
