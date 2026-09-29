export class Game4Storage {

    constructor(key) {
        this.key = key;
    }

    save(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify({ ...data, lastActiveAt: Date.now() }));
        } catch (error) {
            console.warn('Не удалось сохранить Game 4:', error);
        }
    }

    load() {
        try {
            const data = localStorage.getItem(this.key);
            if (!data) return null;
            const saved = JSON.parse(data);
            // В общем прохождении срок един для сюжета и писем, включая паузу/меню.
            // Отдельная страница мини-игры использует собственную метку.
            const lastActiveAt = globalThis.window?.VN?.systems.GameState?.state.lastActiveAt
                ?? saved?.lastActiveAt;
            if (!saved || !Array.isArray(saved.letters)
                || (lastActiveAt && Date.now() - lastActiveAt > 30 * 60 * 1000)) {
                this.clear();
                return null;
            }
            return saved;
        } catch (error) {
            console.error(
                'Ошибка загрузки сохранения Game 4:',
                error
            );

            this.clear();

            return null;
        }
    }

    clear() {
        try {
            localStorage.removeItem(this.key);
        } catch (error) {
            console.warn('Не удалось удалить сохранение Game 4:', error);
        }
    }
}
