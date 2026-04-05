FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

# ĐÂY LÀ DÒNG ĂN TIỀN NHẤT NÈ! 
# Lệnh này sẽ hốt sạch sành sanh app.js, index.html, main.js, 1.png vào thùng!
COPY . .

USER node

EXPOSE 3000

CMD ["node", "app.js"]