const Emitter = require("events");

class Base extends Emitter {
    constructor(filter, options = {}) {
        super();
        this._timeouts = new Set();
        this.filter = filter;
        this.options = options;
        this.collected = new Map();
        this.ended = false;
        this._timeout = null;
        this._idletimeout = null;
        this.handleCollect = this.handleCollect.bind(this);
        this.handleDispose = this.handleDispose.bind(this);
        if (options.time) this._timeout = this.setTimeout(() => this.stop("time"), options.time);
        if (options.idle) this._idletimeout = this.setTimeout(() => this.stop("idle"), options.idle);
    }

    setTimeout(fn, delay, ...args) {
        const timeout = setTimeout(() => {
            fn(...args);
            this._timeouts.delete(timeout);
        }, delay);
        this._timeouts.add(timeout);
        return timeout;
    }

    clearTimeout(timeout) {
        clearTimeout(timeout);
        this._timeouts.delete(timeout);
    }

    handleCollect(...args) {
        const collect = this.collect(...args);

        if (collect && this.filter(...args, this.collected)) {
            this.collected.set(collect, args[0]);
            this.emit("collect", ...args);

            if (this._idletimeout) {
                this.clearTimeout(this._idletimeout);
                this._idletimeout = this.setTimeout(() => this.stop("idle"), this.options.idle);
            }
        }
        this.checkEnd();
    }

    handleDispose(...args) {
        if (!this.options.dispose) return;
        const dispose = this.dispose(...args);
        if (!dispose || !this.filter(...args) || !this.collected.has(dispose)) return;
        this.collected.delete(dispose);
        this.emit("dispose", ...args);
        this.checkEnd();
    }

    get next() {
        return new Promise((resolve, reject) => {
            if (this.ended) {
                reject(this.collected);
                return;
            }

            const cleanup = () => {
                this.removeListener("collect", onCollect);
                this.removeListener("end", onEnd);
            };

            const onCollect = item => {
                cleanup();
                resolve(item);
            };

            const onEnd = () => {
                cleanup();
                reject(this.collected);
            };

            this.on("collect", onCollect);
            this.on("end", onEnd);
        });
    }


    stop(reason = "user") {
        if (this.ended) return;

        if (this._timeout) {
            this.clearTimeout(this._timeout);
            this._timeout = null;
        }
        if (this._idletimeout) {
            this.clearTimeout(this._idletimeout);
            this._idletimeout = null;
        }
        this.ended = true;
        this.emit("end", this.collected, reason);
    }

    resetTimer({ time, idle } = {}) {
        if (this._timeout) {
            this.clearTimeout(this._timeout);
            this._timeout = this.setTimeout(() => this.stop("time"), time || this.options.time);
        }
        if (this._idletimeout) {
        this.clearTimeout(this._idletimeout);
        this._idletimeout = this.setTimeout(() => this.stop("idle"), idle || this.options.idle);
        }
    }

    checkEnd() {
        const reason = this.endReason();
        if (reason) this.stop(reason);
    }

    async *[Symbol.asyncIterator]() {
        const queue = [];
        const onCollect = item => queue.push(item);
        this.on("collect", onCollect);

        try {
            while (queue.length || !this.ended) {
                if (queue.length) {
                    yield queue.shift();
                } else {
                    await new Promise(resolve => {
                        const tick = () => {
                            this.removeListener("collect", tick);
                            this.removeListener("end", tick);
                            return resolve();
                        };
                        this.on("collect", tick);
                        this.on("end", tick);
                    });
                }
            }
        } finally {
            this.removeListener("collect", onCollect);
        }
    }

    collect() {}
    dispose() {}
    endReason() {}
}

module.exports = Base;
