import { createSubscriptionClient, SUBSCRIPTION_NETWORK_ERROR, SUBSCRIPTION_UNAVAILABLE } from './subscription.js';

/** HTML-форма размещается в DOM-слое Phaser и масштабируется вместе с FIT. */
export function createSubscribeForm({ width, height, placeholder, subscribe = createSubscriptionClient() }) {
    const form = document.createElement('form');
    form.className = 'finish-subscribe-form';
    form.setAttribute('aria-label', 'Подписка на новости');
    form.noValidate = true;
    form.style.width = `${width}px`;
    form.style.height = `${height}px`;

    const input = document.createElement('input');
    input.type = 'email';
    input.name = 'email';
    input.required = true;
    input.inputMode = 'email';
    input.placeholder = placeholder;
    input.autocomplete = 'email';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.className = 'finish-email-input';
    input.setAttribute('aria-label', 'Ваш email');
    Object.assign(input.style, {
        left: `${width * (10 / 237)}px`, top: `${height * (5 / 41)}px`,
        width: `${width * (168 / 237)}px`, height: `${height * (30 / 41)}px`,
        fontSize: `${height * (24 / 41)}px`, lineHeight: `${height * (30 / 41)}px`
    });

    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'finish-subscribe-submit';
    button.setAttribute('aria-label', 'Подписаться');
    button.title = 'Подписаться';
    button.style.width = `${width * (47 / 237)}px`;
    button.style.height = `${height}px`;
    form.append(input, button);

    const dialog = document.createElement('dialog');
    dialog.className = 'finish-subscribe-dialog';
    dialog.setAttribute('aria-labelledby', 'finish-subscribe-title');
    dialog.setAttribute('aria-describedby', 'finish-subscribe-message');
    const title = document.createElement('h2');
    title.id = 'finish-subscribe-title';
    title.textContent = 'Подписка на новости';
    const message = document.createElement('p');
    message.id = 'finish-subscribe-message';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Понятно';
    close.addEventListener('click', () => dialog.close());
    dialog.append(title, message, close);
    document.body.append(dialog);

    for (const element of [form, dialog]) {
        element.addEventListener('keydown', event => event.stopPropagation());
        element.addEventListener('keyup', event => event.stopPropagation());
    }

    let pending = null;
    let destroyed = false;
    const showMessage = text => {
        // Ответ сервера всегда отображается текстом, без вставки HTML.
        message.textContent = text;
        if (!dialog.open) dialog.showModal();
    };
    const setBusy = busy => {
        button.disabled = busy;
        input.readOnly = busy;
        form.setAttribute('aria-busy', String(busy));
        button.setAttribute('aria-label', busy ? 'Отправляем…' : 'Подписаться');
    };

    const onSubmit = async event => {
        event.preventDefault();
        if (pending || destroyed) return;

        input.value = input.value.trim();
        input.setCustomValidity('');
        if (!input.checkValidity()) {
            input.setCustomValidity('Введите корректный email.');
            input.reportValidity();
            input.focus();
            return;
        }

        // Аналитика заказчика необязательна и не должна блокировать запрос.
        try { window.yp?.ga?.event?.('Footer', 'click_footer_subscribe_email'); } catch {}
        pending = new AbortController();
        setBusy(true);
        try {
            const result = await subscribe(input.value, { signal: pending.signal });
            if (!destroyed) showMessage(result.message);
        } catch (error) {
            if (!destroyed) showMessage(error.message === SUBSCRIPTION_UNAVAILABLE
                ? SUBSCRIPTION_UNAVAILABLE : SUBSCRIPTION_NETWORK_ERROR);
        } finally {
            pending = null;
            if (!destroyed) setBusy(false);
        }
    };
    input.addEventListener('input', () => input.setCustomValidity(''));
    form.addEventListener('submit', onSubmit);

    return {
        node: form,
        input,
        destroy() {
            destroyed = true;
            pending?.abort();
            form.removeEventListener('submit', onSubmit);
            if (dialog.open) dialog.close();
            dialog.remove();
            form.remove();
        }
    };
}
