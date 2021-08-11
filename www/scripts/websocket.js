export class WS {
  #address;
  #connection;
  #state;

  constructor(address) {
    this.#address = address;
    this.#connection = new WebSocket(address);
    this.#state = new State();
    this.#setHandlers();
  }

  send = (data) => {
    this.#connection.send(data);
  }

  #setHandlers = () => {
    this.#connection.onclose = (e) => {
      console.log('socket was closed', e.reason);
      this.#state.logClose();
      setTimeout(() => {
        this.#connection = new WebSocket(this.#address);
        this.#setHandlers();
      }, this.#state.retryTime);
    };
  };
}

class State {
  #closeTimes;

  constructor() {
    this.#closeTimes = [];
  }

  logClose = () => {
    // remove closures older than 5 minutes
    this.#closeTimes = this.#closeTimes.filter(
      (t) => Date.now() - t < 5 * 60 * 1000
    );
    this.#closeTimes.push(Date.now());
  }

  get retryTime() {
    const backoffTime = 600 * this.#closeTimes.length;
    return Math.min(maxBackoff, backoffTime);
  }
}

const maxBackoff = 5 * 60 * 1000;
