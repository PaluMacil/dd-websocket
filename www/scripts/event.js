/**
 * @template {{[key: string]: ((...args:Array<Any>)=>void)}} TEventDefs
 */
 export class EventDispatcher {
  /**
   * @type {Map<keyof TEventDefs, Array<(...args:Array<any>) => void>>}

   */
  #eventHandlers = new Map();

  /**
   * 
   * @param {T} eventType 
   * @param {TEventDefs[T]} handler
   * @template {keyof TEventDefs} T
   */
  addEventListener = (eventType, handler) => {
    // Note: I made this a lambda to make it easy to do direct assignment
    // eg: ``` this.addEventListener = this.#events.addEventListener; ```
    let handlers = this.#eventHandlers.get(eventType);
    if (!handlers) {
      handlers = [];
      this.#eventHandlers.set(eventType, handlers);
    }
    handlers.push(handler);
  };

  /**
   * 
   * @param {T} eventType 
   * @param  {Parameters<TEventDefs[T]>} args 
   * @template {keyof TEventDefs} T
   */
  fireEvent(eventType, ...args) {
    const handlers = this.#eventHandlers.get(eventType);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Unhandled error occurred while processing event handler for ${eventType}`);
        console.error(error);
      }
    });
  }
}
