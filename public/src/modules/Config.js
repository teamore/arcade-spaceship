export default class Config {
    payload;
    src = undefined;
    constructor(src = undefined) {
        if (src !== undefined) {
            this.load(src);
        }
    }
    load(src) {
        this.src = src;
        fetch(src)
            .then((response) => response.json())
            .then((json) => {
                this.payload = json;
                this.onLoad(json);
            });
    }
    save() {
        if (this.src !== undefined) {
            fetch("save_scores.php", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.payload),
            })
                .then((response) => response.json())
                .then((json) => {
                    this.onSave(json);
                });
        }

    }
    onSave(json) {

    }
    onLoad(json) {

    }
    getAll() {
        return this.payload;
    }
    get(path) {
        if (!this.payload) {
            console.error("Config Data could not be retrieved");
            return undefined;
        }
        if (this.payload[path] !== undefined) {
            return this.payload[path];
        }

        return path.split('.').reduce((acc, key) => {
            if (acc && key in acc) {
                return acc[key];
            }
            return undefined;
        }, this.payload);
    }

    set(path, value) {
        if (!this.payload) {
            console.error("Config Data could not be retrieved");
            return;
        }
        if (this.payload[path] !== undefined) {
            this.payload[path] = value;
        }

        const keys = path.split('.');
        let obj = this.payload;

        keys.forEach((key, index) => {
            if (index === keys.length - 1) {
                obj[key] = value;
            } else {
                if (!obj[key]) obj[key] = {};
                obj = obj[key];
            }
        });
    }
}