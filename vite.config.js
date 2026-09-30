import { defineConfig } from 'vite';

export default defineConfig({
    base: '/yasnaya-polayna/',
    // На Windows «localhost» может указывать на IPv6 (::1), а браузер
    // стучится на 127.0.0.1 — тогда страница «не может подключиться».
    server: {
        host: '127.0.0.1'
    }
});