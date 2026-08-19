/**
 * JavaScript Core Concepts Module for Evaluation Rubrics:
 * 1. JavaScript — Closures
 * 2. JavaScript — Hoisting
 * 3. JavaScript — Event loop (Microtasks vs Macrotasks)
 * 4. JavaScript — Promises vs Callbacks
 * 5. JavaScript — async/await
 */

// ============================================================================
// 1. JAVASCRIPT — CLOSURES
// ============================================================================
// A closure is a function bundled together with references to its surrounding state.
export function createTicketCodeCounter(cityPrefix) {
  let counter = 1000; // Enclosed private state variable

  return function generateNextTicket() {
    counter += 1;
    return `TKT-${cityPrefix.toUpperCase()}-${counter}`;
  };
}

// ============================================================================
// 2. JAVASCRIPT — HOISTING
// ============================================================================
// Function declarations are hoisted completely to top of scope, while `var` variables are hoisted with `undefined`.
export function demonstrateHoisting() {
  const result = [];
  
  // Call function before definition (Function Hoisting)
  result.push(getSystemStatus());

  function getSystemStatus() {
    return 'Hoisting Demo: Function declaration invoked before its visual declaration in source file.';
  }

  return result;
}

// ============================================================================
// 3. JAVASCRIPT — EVENT LOOP (Microtasks vs Macrotasks)
// ============================================================================
// Demonstrating the event loop priority order: Synchronous -> Microtasks (Promises) -> Macrotasks (setTimeout)
export function demonstrateEventLoop() {
  const executionLogs = [];

  executionLogs.push('1. Synchronous execution (Call Stack)');

  // Macrotask (queued to Timer phase of Event Loop)
  setTimeout(() => {
    executionLogs.push('4. Macrotask executed (setTimeout callback in Event Loop Timer Phase)');
  }, 0);

  // Microtask (queued to Microtask queue, executes before next macrotask)
  Promise.resolve().then(() => {
    executionLogs.push('2. Microtask executed (Promise resolution in Event Loop Microtask Queue)');
  });

  executionLogs.push('3. Synchronous execution completed');

  return executionLogs;
}

// ============================================================================
// 4. JAVASCRIPT — PROMISES VS CALLBACKS
// ============================================================================
// Callback pattern (legacy async handling)
export function fetchEventWithCallback(eventId, callback) {
  setTimeout(() => {
    if (!eventId) {
      return callback(new Error('Event ID is required'), null);
    }
    callback(null, { id: eventId, title: 'Callback Pattern Event', status: 'Success' });
  }, 10);
}

// Promise pattern (modern async handling)
export function fetchEventWithPromise(eventId) {
  return new Promise((resolve, reject) => {
    if (!eventId) {
      reject(new Error('Event ID is required'));
    } else {
      resolve({ id: eventId, title: 'Promise Pattern Event', status: 'Success' });
    }
  });
}

// ============================================================================
// 5. JAVASCRIPT — ASYNC / AWAIT
// ============================================================================
export async function fetchEventDataAsync(eventId) {
  try {
    const data = await fetchEventWithPromise(eventId);
    return { ...data, asyncAwaitProcessed: true };
  } catch (err) {
    throw new Error(`Async/Await Exception Caught: ${err.message}`);
  }
}
