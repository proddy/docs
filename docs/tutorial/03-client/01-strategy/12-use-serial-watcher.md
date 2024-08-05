---
title: useWatcher with serial
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::info policy type

use hook

:::

> Before using extension hooks, make sure you are familiar with the basic usage of alova.

Status update triggers a set of serial requests, which is more concise and easy to use than [serial request in best practice](/tutorial/project/best-practice/serial-request), with unified loading status, error, and callback functions.

## Features

- A more concise and easy-to-use serial method;
- Unified request status and callback function;
- Status update triggers serial execution of multiple requests;

<!-- ## Example

[serial request](/tutorial/example/vue/serial-request) -->

## Usage

### Basic usage

Same usage as `useWatcher`, except that the first parameter is changed to an array of handlers executed serially, and each handler will receive the response data of the previous request.

```javascript
import { useSerialWatcher } from 'alova/client';

const {
  // Serial loading status, all requests will be changed to false
  loading,

  // The response data of the last request
  data,

  // Any request error will record the error message here
  error,

  // Manually send a serial request
  send,

  // serial request success callback binding function
  onSuccess,

  // Serial request error callback binding function, any request error will trigger it
  onError,

  // Serial request completion callback binding function
  onComplete
} = useSerialWatcher(
  [
    // args is the parameter passed in by the send function
    (...args) => request1(args),

    // Starting from the second handler, the first parameter is the response data of the previous request, and args is received from the second
    (response1, ...args) => request2(response1, args),
    (response2, ...args) => request3(response2, args)
  ],
  [watchedState1, watchedState2],
  {
    immediate: true
  }
);

// Manually trigger the request and pass parameters
send(1, 2, 3);
```

It is worth noting that the first item in the handler array can also be specified as a method instance, and the second item must be a function.

```javascript
useSerialRequest([
  methodInstance,
  (response1, ...args) => request2(response1, args),
  (response2, ...args) => request3(response2, args)
]);
```

### Request error

When any of the serial requests is wrong, `onError` will be triggered, and its `event.method` will point to the method instance of the request error.

## API

### Hook configuration

Inherit all configurations of [**useWatcher**](/api/core-hooks#usewatcher).

### Responsive data

Inherit all responsive data from [**useWatcher**](/api/core-hooks#usewatcher).

### Action function

Inherit all action functions of [**useWatcher**](/api/core-hooks#usewatcher).

### Event

Inherit all events from [**useWatcher**](/api/core-hooks#usewatcher).
