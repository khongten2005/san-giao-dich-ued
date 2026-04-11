# Dùng bản Node.js nhẹ và ổn định
FROM node:18

# Tạo thư mục làm việc trong container
WORKDIR /app

# Chép file quản lý thư viện vào trước để cache cho nhanh
COPY package*.json ./

# Cài đặt thư viện
RUN npm install

# Chép toàn bộ code còn lại vào
COPY . .

# Mở cổng 3000 (cổng mà app.js của đại ca đang chạy)
EXPOSE 3000

# Lệnh khởi chạy app
CMD ["node", "app.js"]