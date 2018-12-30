import Notifier from './notifier';

export const EVENTED = '__evented__';

/**
 * Has a class been decorated as `@evented`?
 */
export function isEvented(obj: any): boolean {
  return !!obj[EVENTED];
}

/**
 * A class decorated as `@evented` should also implement the `Evented`
 * interface.
 *
 * ```ts
 * import { evented, Evented } from '@orbit/core';
 *
 * @evented
 * class Source implements Evented {
 *   // ... Evented implementation
 * }
 * ```
 */
export interface Evented {
  on: (event: string, callback: Function, binding?: object) => void;
  off: (event: string, callback: Function, binding?: object) => void;
  one: (event: string, callback: Function, binding?: object) => void;
  emit: (event: string, ...args: any[]) => void;
  listeners: (event: string) => any[];
}

/**
 * Marks a class as evented.
 *
 * An evented class should also implement the `Evented` interface.
 *
 * ```ts
 * import { evented, Evented } from '@orbit/core';
 *
 * @evented
 * class Source implements Evented {
 *   ...
 * }
 * ```
 *
 * Listeners can then register themselves for particular events with `on`:
 *
 * ```ts
 * let source = new Source();
 *
 * function listener1(message: string) {
 *   console.log('listener1 heard ' + message);
 * };
 * function listener2(message: string) {
 *   console.log('listener2 heard ' + message);
 * };
 *
 * source.on('greeting', listener1);
 * source.on('greeting', listener2);
 *
 * evented.emit('greeting', 'hello'); // logs "listener1 heard hello" and
 *                                    //      "listener2 heard hello"
 * ```
 *
 * Listeners can be unregistered from events at any time with `off`:
 *
 * ```ts
 * source.off('greeting', listener2);
 * ```
 */
export default function evented(Klass: any): void {
  let proto = Klass.prototype;

  if (isEvented(proto)) {
    return;
  }

  proto[EVENTED] = true;

  proto.on = function(eventName: string, callback: Function, _binding: object) {
    const binding = _binding || this;

    notifierForEvent(this, eventName, true).addListener(callback, binding);
  };

  proto.off = function(eventName: string, callback: Function, _binding: object) {
    const binding = _binding || this;
    const notifier = notifierForEvent(this, eventName);

    if (notifier) {
      if (callback) {
        notifier.removeListener(callback, binding);
      } else {
        removeNotifierForEvent(this, eventName);
      }
    }
  };

  proto.one = function(eventName: string, callback: Function, _binding: object) {
    let binding = _binding || this;
    let notifier = notifierForEvent(this, eventName, true);

    let callOnce = function() {
      callback.apply(binding, arguments);
      notifier.removeListener(callOnce, binding);
    };

    notifier.addListener(callOnce, binding);
  };

  proto.emit = function(eventName: string, ...args: any[]) {
    let notifier = notifierForEvent(this, eventName);

    if (notifier) {
      notifier.emit.apply(notifier, args);
    }
  };

  proto.listeners = function(eventName: string) {
    let notifier = notifierForEvent(this, eventName);
    return notifier ? notifier.listeners : [];
  };
}

/**
 * Settle any promises returned by event listeners in series.
 *
 * If any errors are encountered during processing, they will be ignored.
 */
export function settleInSeries(obj: Evented, eventName: string, ...args: any[]): Promise<void> {
  const listeners = obj.listeners(eventName);

  return listeners.reduce((chain, [callback, binding]) => {
    return chain
      .then(() => callback.apply(binding, args))
      .catch(() => {});
  }, Promise.resolve());
}

/**
 * Fulfill any promises returned by event listeners in series.
 *
 * Processing will stop if an error is encountered and the returned promise will
 * be rejected.
 */
export function fulfillInSeries(obj: Evented, eventName: string, ...args: any[]): Promise<void> {
  const listeners = obj.listeners(eventName);

  return new Promise((resolve, reject) => {
    fulfillEach(listeners, args, resolve, reject);
  });
}

function notifierForEvent(object: any, eventName: string, createIfUndefined = false) {
  if (object._eventedNotifiers === undefined) {
    object._eventedNotifiers = {};
  }
  let notifier = object._eventedNotifiers[eventName];
  if (!notifier && createIfUndefined) {
    notifier = object._eventedNotifiers[eventName] = new Notifier();
  }
  return notifier;
}

function removeNotifierForEvent(object: any, eventName: string) {
  if (object._eventedNotifiers && object._eventedNotifiers[eventName]) {
    delete object._eventedNotifiers[eventName];
  }
}

function fulfillEach(listeners: [Function, object][], args: any[], resolve: Function, reject: Function): Promise<any> {
  if (listeners.length === 0) {
    resolve();
  } else {
    let listener;
    [listener, ...listeners] = listeners;
    let [callback, binding] = listener;
    let response = callback.apply(binding, args);

    if (response) {
      return Promise.resolve(response)
        .then(() => fulfillEach(listeners, args, resolve, reject))
        .catch((error: Error) => reject(error));
    } else {
      fulfillEach(listeners, args, resolve, reject);
    }
  }
}
