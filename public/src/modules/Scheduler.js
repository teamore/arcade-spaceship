export default class Scheduler {
    schedule = undefined;
    constructor(schedule) {
        this.schedule = schedule;
    }
    run(time) {
        let events = [];
        for(const event of this.schedule) {
            if (time >= parseFloat(event.start) && time <= parseFloat(event.end || parseFloat(event.start) )) {
                events.push(event);
            }
        }
        for(const event of events) {
            this._onEvent(event, time);
        }
        this.onEvents(events, time);
    }
    onEvents(events, time) {

    }
    _onEvents(events, time) {
        this.onEvents(events, time);
    }
    onEvent(event, time) {

    }
    _onEvent(event, time) {
        this.onEvent(event, time);
    }
}