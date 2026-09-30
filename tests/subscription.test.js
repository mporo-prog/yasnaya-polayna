import assert from 'node:assert/strict';
import test from 'node:test';
import { createSubscriptionClient, SUBSCRIPTION_UNAVAILABLE } from '../games/finish/subscription.js';

function fixture({ token = 'page-token', result = { error: 0 }, fetchRequest, timeoutMs = 15000 } = {}) {
    const calls = [];
    const subscribe = createSubscriptionClient({
        pageDocument: {
            baseURI: 'https://game.ypmuseum.ru/yasnaya-polayna/games/finish/index.html',
            querySelector: () => token ? { content: token } : null
        },
        parseHtml: html => ({ querySelector: () => html === 'with-token' ? { content: 'session-token' } : null }),
        fetchRequest: async (url, options) => {
            calls.push({ url, options });
            return fetchRequest ? fetchRequest(url, options)
                : { ok: true, json: async () => result };
        },
        timeoutMs
    });
    return { subscribe, calls };
}

test('subscription posts the jQuery-compatible payload to the game proxy with the current CSRF token', async () => {
    const { subscribe, calls } = fixture();
    const result = await subscribe('  person+tag@example.test  ');
    assert.equal(result.status, 'confirmation');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://game.ypmuseum.ru/request/subscribe');
    const { options } = calls[0];
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.mode, 'same-origin');
    assert.equal(options.headers['X-Requested-With'], 'XMLHttpRequest');
    assert.match(options.headers['Content-Type'], /^application\/x-www-form-urlencoded/);
    assert.equal(options.body.get('email'), 'person+tag@example.test');
    assert.equal(options.body.get('_csrf'), 'page-token');
    assert.match(options.body.toString(), /person%2Btag%40example.test/);
});

test('a static page first obtains session cookies and the token through the same-origin session route', async () => {
    const { subscribe, calls } = fixture({
        token: null,
        fetchRequest: async (_url, options) => options.method === 'POST'
            ? { ok: true, json: async () => ({ error: 0 }) }
            : { ok: true, text: async () => 'with-token' }
    });
    await subscribe('person@example.test');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://game.ypmuseum.ru/request/subscribe-session');
    assert.equal(calls[0].options.cache, 'no-store');
    assert.equal(calls[0].options.credentials, 'same-origin');
    assert.equal(calls[1].options.body.get('_csrf'), 'session-token');
});

test('missing CSRF token never sends the email to the POST endpoint', async () => {
    const { subscribe, calls } = fixture({
        token: null,
        fetchRequest: async () => ({ ok: true, text: async () => '<html>static game</html>' })
    });
    await assert.rejects(subscribe('person@example.test'), { message: SUBSCRIPTION_UNAVAILABLE });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.body, undefined);
});

test('both numeric and string subscription result codes match the main site', async () => {
    for (const [code, status] of [[0, 'confirmation'], ['0', 'confirmation'], [11, 'already-subscribed'], ['11', 'already-subscribed']]) {
        assert.equal((await fixture({ result: { error: code } }).subscribe('person@example.test')).status, status);
    }
});

test('server errors retain their plain message; missing or misleading codes never imply success', async () => {
    const message = '<img src=x onerror=alert(1)> Адрес отклонён';
    const result = await fixture({ result: { error: 9, message } }).subscribe('person@example.test');
    assert.deepEqual(result, { status: 'error', message });
    for (const response of [{}, null, { error: null }, { error: false }, { error: '' }]) {
        assert.deepEqual(await fixture({ result: response }).subscribe('person@example.test'), {
            status: 'error', message: SUBSCRIPTION_UNAVAILABLE
        });
    }
});

test('HTTP errors, invalid JSON and network failures do not automatically repeat POST', async () => {
    for (const fetchRequest of [
        async () => ({ ok: false, status: 403 }),
        async () => ({ ok: true, json: async () => { throw new SyntaxError('Not JSON'); } }),
        async () => { throw new TypeError('Network failure'); }
    ]) {
        const { subscribe, calls } = fixture({ fetchRequest });
        await assert.rejects(subscribe('person@example.test'));
        assert.equal(calls.length, 1);
    }
});

test('leaving the screen cancels the pending request', async () => {
    const controller = new AbortController();
    const { subscribe, calls } = fixture({
        fetchRequest: (_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        })
    });
    const pending = subscribe('person@example.test', { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(calls[0].options.signal.aborted, true);
});

test('a stalled request times out, releasing the form for another attempt', async () => {
    const { subscribe } = fixture({
        timeoutMs: 5,
        fetchRequest: (_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        })
    });
    await assert.rejects(subscribe('person@example.test'), { name: 'AbortError' });
});
