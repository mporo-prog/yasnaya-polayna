import { defineConfig } from 'vite';

export default defineConfig({
    base: '/yasnaya-polayna/',
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                finish: 'games/finish/index.html'
            }
        }
    },
    // В production эти же маршруты настраиваются на сервере игры.
    // См. deploy/subscription.nginx.conf.
    server: {
        proxy: {
            '^/request/subscribe-session$': {
                target: 'https://ypmuseum.ru',
                proxyTimeout: 12000,
                timeout: 15000,
                changeOrigin: true,
                cookieDomainRewrite: '',
                rewrite: () => '/',
                headers: { Origin: 'https://ypmuseum.ru', Referer: 'https://ypmuseum.ru/' }
            },
            '^/request/subscribe$': {
                target: 'https://ypmuseum.ru',
                proxyTimeout: 12000,
                timeout: 15000,
                changeOrigin: true,
                cookieDomainRewrite: '',
                headers: { Origin: 'https://ypmuseum.ru', Referer: 'https://ypmuseum.ru/' }
            }
        }
    }
});
