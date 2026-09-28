export class Game4Storage {

    constructor(key) {
        this.key = key;
    }

    save(data) {
        localStorage.setItem(
            this.key,
            JSON.stringify(data)
        );
    }

    load() {
        const data = localStorage.getItem(this.key);

        if (!data) {
            return null;
        }

        try {
            return JSON.parse(data);
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
        localStorage.removeItem(this.key);
    }
}