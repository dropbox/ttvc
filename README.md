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

> ⚠️ **This API has not stabilized and is likely to change.**

```js
import {init, getTTVC} from '@dropbox-performance/ttvc';

// Vall this as early in pageload as possible to setup instrumentation.
init();

// Reports the last visible change for each navigation that
// occurs during the life of this document.
const unsubscribe = getTTVC((measurement) => {
  console.log('TTVC:', measurement.duration);
});
```

## Report metrics to a collection endpoint

TBC

## Record a PerformanceTimeline entry

TBC

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
