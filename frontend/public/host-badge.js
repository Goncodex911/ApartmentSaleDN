// Chỉ Netlify (gói Free) chèn huy hiệu ở đáy màn hình → gắn class sớm để CSS chừa chỗ, không bị nhảy bố cục.
// File riêng thay cho <script> viết thẳng trong index.html: Content-Security-Policy (Story 19.9) chặn script nội tuyến.
if (location.hostname.endsWith('netlify.app')) document.documentElement.classList.add('on-netlify');
