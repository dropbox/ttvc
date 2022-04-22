`ttvc`
======

- [Overview](#overview)
- [Get started](#get-started)
- [Usage](#usage)
  - [Basic usage](#basic-usage)
  - [Report metrics to a collection endpoint](#report-metrics-to-a-collection-endpoint)
  - [Record a PerformanceTimeline entry](#record-a-performancetimeline-entry)
  - [Client-side navigation with React Router](#client-side-navigation-with-react-router)
- [API](#api)
  - [Types](#types)
  - [Functions](#functions)
- [Browser Support](#browser-support)
- [Developing](#developing)
  - [Building](#building)
  - [Testing](#testing)

# Overview

> ⚠️ **This library is an experimental early-stage project. Use at your own risk.**

`ttvc` provides an in-browser implementation of the VisuallyComplete metric suitable for field data collection (real-user monitoring).

Visually Complete measures the moment in time when users perceive that all the visual elements of a page have completely loaded. Once the page has reached visually complete, nothing else should change in the viewport without the user’s input.

# Get started

This library is available from npm.  Add it to your project using the `npm` or `yarn` package managers.

```
$ npm install @dropbox-performance/ttvc
```

```
$ yarn add @dropbox-performance/ttvc
```

# Usage

## Basic usage

```js
import {init, getTTVC} from '@dropbox-performance/ttvc';

// Call this as early in pageload as possible to setup instrumentation.
init({
  debug: false,
  idleTimeout: 2000,
  networkTimeout: 0,
});

// Reports the last visible change for each navigation that
// occurs during the life of this document.
const unsubscribe = getTTVC((measurement) => {
  console.log('TTVC:', measurement.duration);
});
```

## Report metrics to a collection endpoint

```js
import {init, getTTVC} from '@dropbox-performance/ttvc';

init();

let measurements = [];

// capture measurements in client
getTTVC((measurement) => {
  measurements.append(measurement);
});

// flush data to server when page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    navigator.sendBeacon('/log', JSON.stringify(measurements));
    measurements = [];
  }
});
```

## Record a PerformanceTimeline entry

Capture a span using the [Performance Timeline](https://developer.mozilla.org/en-US/docs/Web/API/Performance_Timeline) API.

NOTE: Setting arbitrary start and end times with `performance.measure` relies on the [User Timing Level 3](https://w3c.github.io/user-timing/) specification. This is not yet adopted by all major browsers.

```js
import {init, getTTVC} from '@dropbox-performance/ttvc';

init();

getTTVC(({start, end, duration, detail}) => {
  window.performance.measure('TTVC', {
    start,
    end,
    duration,
    detail,
  });
});
```

## Client-side navigation with React Router

@dropbox-performance/ttvc supports measuring client-side navigations!

What counts as navigation may be different in each application, but as long as you signal that a navigation has begun, this library can figure out the rest.

To trigger a new navigation measurement, simply dispatch a "locationchange" event on the window object.

```js
// analytics.js
import {init, getTTVC} from '@dropbox-performance/ttvc';

init();

getTTVC((measurement) => {
  console.log('TTVC:', measurement.duration);
});
```

```js
// app.js
import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, useLocation} from 'react-router-dom';

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('root')
);

const App = () => {
  const location = useLocation();

  useEffect(() => {
    // This event signals to ttvc that a new navigation has begun.
    window.dispatchEvent(new Event('locationchange'));
  }, [location]);

  return (
    <div className="App">
      <h1>Welcome to React Router!</h1>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* ... more routes */}
      </Routes>
    </div>
  );
};
```

# API

## Types

### `Metric`

```typescript
export type Metric = {
  // time since timeOrigin that the navigation was triggered
  // (this will be 0 for the initial pageload)
  start: number;

  // time since timeOrigin that ttvc was marked for the current navigation
  end: number;

  // the difference between start and end; this is the value of "TTVC"
  duration: number;

  // additional metadata related to the current navigation
  detail: {
    // if ttvc ignored a stalled network request, this value will be true
    didNetworkTimeOut: boolean;
  };
};
```

### `TtvcOptions`

```typescript
export type TtvcOptions = {
  // decide whether to log debug messages
  debug?: boolean;

  // the duration in ms to wait before declaring the page completely idle
  idleTimeout?: number;

  // a duration in ms to wait before assuming that a single network request
  // was not instrumented correctly
  networkTimeout?: number;
};
```

## Functions

### `init()`

```typescript
type init = (options?: TtvcOptions) -> void;
```

Sets up instrumentation for the current page and begins monitoring.  For the most accurate results, call this as early in pageload as possible.

Accepts an optional options argument (see above).

### `getTTVC()`

```typescript
type getTTVC = (subscriber: (metric: Metric) -> void) -> () => void;
```

Register a callback function as a subscriber to new TTVC metric measurements.  Returns an "unsubscribe" function which may be called to unregister the subscribed callback function.

The callback function may be called more than once if in-page navigation occurs.

`getTTVC` may be called more than once to register more than one subscriber.

### `incrementAjaxCount() & decrementAjaxCount()`

```typescript
type incrementAjaxCount = () -> void;
type decrementAjaxCount = () -> void;
```

Use these functions to instrument AJAX requests in your application.  Try to ensure `incrementAjaxCount` and `decrementAjaxCount` are called exactly once for each request, regardless of success or failure.

e.g.

```javascript
// patch window.fetch
const nativeFetch = window.fetch;

window.fetch = (...args) => {
  TTVC.incrementAjaxCount();
  return nativeFetch(...args)
    .finally(TTVC.decrementAjaxCount);
};

```


# Browser Support

TBC

# Developing

This package expects node version 16 or greater, and the `yarn` package manager.  Once you have these prerequisites, install project dependencies with:

```
yarn install
```

## Building

This project is developed with TypeScript.  You can compile the TypeScript source files to JavaScript with:

```
$ yarn build
```

While testing locally, you may find it useful to build the rollup bundle in watch mode.

```
$ yarn build:rollup --watch
```

## Testing

You can run all tests together with:

```
$ yarn test
```

### Individual tests

There are four individual test scripts

```
$ yarn test:lint // runs eslint
$ yarn test:typecheck // runs typescript with --noEmit
$ yarn test:unit // runs jest unit tests
$ yarn test:e2e // runs playwright tests (requires yarn build to have been run)
```


### Testing with Playwright

Before running any playwright tests, you will need to install the default set of browsers:

```
$ npx playwright install
```

Run test suite:

```
$ yarn build // build the ttvc package before testing
$ yarn test:e2e
```

To manually test pages, start the test server.

```
$ yarn express
```

You can launch tests in the browser by opening http://localhost:3000/test/[test-folder].  e.g. http://localhost:3000/test/ajax1/
