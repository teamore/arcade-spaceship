export default class Scheduler {
    schedule = undefined;
    cursor = -1;
    constructor(schedule) {
        this.schedule = schedule;
        this.cursor = -1;
    }
    run(cursor = undefined) {
        this.cursor = (cursor !== undefined) ? cursor : this.cursor + 1;
        let events = [];
        for(const event of this.schedule) {
            let end = parseFloat(event.end || event.loop || this.cursor);
            if (event.loop && this.cursor == parseFloat(event.loop)) {
                if (this._onLoopEnd(event, this.cursor)) {
                    this.cursor = event.start - 1;
                    this._onLoopStart(event, this.cursor);
                }
            }
            if (this.cursor >= parseFloat(event.start) && this.cursor <= end ) {
                let cycle = (event.cycle || 0) + 1;
                if (event.cycles === false || cycle <= (event.cycles || cycle)) {
                    events.push(event);
                    event.cycle = cycle;
                }
            }
        }
        for(const event of events) {
            this._onEvent(event, this.cursor);
        }
        this.onEvents(events, this.cursor);
    }
    onEvents(events, cursor = undefined) {

    }
    _onEvents(events, cursor) {
        this.onEvents(events, cursor || this.cursor);
    }
    onEvent(event, cursor = undefined) {
        return true;
    }
    _onEvent(event, cursor) {
        return this.onEvent(event, cursor);
    }
    onLoopStart(event, cursor) {
        return true;
    }
    _onLoopStart(event, cursor) {
        return this.onLoopStart(event, cursor);
    }
    onLoopEnd(event, cursor) {
        return true;
    }
    _onLoopEnd(event, cursor) {
        return this.onLoopEnd(event, cursor);
    }
}