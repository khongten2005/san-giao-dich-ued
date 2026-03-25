FROM nginx:alpine

# Xóa file cấu hình mặc định cũ của Nginx
RUN rm /etc/nginx/nginx.conf

# Chép file cấu hình phân luồng VIP của bạn vào
COPY nginx.conf /etc/nginx/nginx.conf