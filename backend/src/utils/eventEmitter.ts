import { EventEmitter } from 'events';

export const scoreEvents = new EventEmitter();

// Set max listeners to prevent warning logs
scoreEvents.setMaxListeners(100);
