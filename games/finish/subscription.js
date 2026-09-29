export const SUBSCRIPTION_UNAVAILABLE = 'Подписка временно недоступна. Попробуйте позже.';
export const SUBSCRIPTION_NETWORK_ERROR = 'Нет доступа к сайту. Попробуйте ещё раз позже.';

/** Контракт основного сайта: POST /request/subscribe, email + _csrf, JSON. */
export function createSubscriptionClient({
    pageDocument = document,
    fetchRequest = (...args) => fetch(...args),
    parseHtml = html => new DOMParser().parseFromString(html, 'text/html'),
    timeoutMs = 15000
} = {}) {
    const origin = new URL(pageDocument.baseURI).origin;
    const endpoint = new URL('/request/subscribe', origin).href;

    return async function subscribe(email, { signal } = {}) {
        const controller = new AbortController();
        const cancel = () => controller.abort();
        if (signal?.aborted) cancel();
        else signal?.addEventListener('abort', cancel, { once: true });
        const timeout = setTimeout(cancel, timeoutMs);

        const request = (url, options = {}) => fetchRequest(url, {
            credentials: 'same-origin',
            mode: 'same-origin',
            signal: controller.signal,
            ...options
        });

        try {
            let token = pageDocument.querySelector('meta[name="csrf-token"]')?.content;

            // Этот адрес проксирует главную ypmuseum.ru через домен игры,
            // сохраняя связь CSRF-токена с cookie одной сессии.
            if (!token) {
                const page = await request(new URL('/request/subscribe-session', origin).href, {
                    cache: 'no-store',
                    headers: { Accept: 'text/html' }
                });
                if (!page.ok) throw new Error(SUBSCRIPTION_NETWORK_ERROR);
                token = parseHtml(await page.text()).querySelector('meta[name="csrf-token"]')?.content;
            }

            // Не отправляем email без токена и не выдаём такую попытку за успех.
            if (!token) throw new Error(SUBSCRIPTION_UNAVAILABLE);
            controller.signal.throwIfAborted();

            const response = await request(endpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({ email: email.trim(), _csrf: token })
            });
            if (!response.ok) throw new Error(SUBSCRIPTION_NETWORK_ERROR);

            const result = await response.json();
            if (result?.error === 0 || result?.error === '0') {
                return {
                    status: 'confirmation',
                    message: 'Проверьте свой почтовый ящик.\nМы отправили Вам письмо со ссылкой на подтверждение подписки.'
                };
            }
            if (result?.error === 11 || result?.error === '11') {
                return { status: 'already-subscribed', message: 'Вы уже подписаны. Спасибо!' };
            }
            return {
                status: 'error',
                message: typeof result?.message === 'string' && result.message.trim()
                    ? result.message : SUBSCRIPTION_UNAVAILABLE
            };
        } finally {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', cancel);
        }
    };
}
