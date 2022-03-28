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
import {PageloadVisuallyCompleteCalculator} from '@dropbox-performance/ttvc';

// Initialize the calculator as early as possible in your page
// load so that it can observe changes.
const calculator = new PageLoadVisuallyCompleteCalculator();
calculator.start();

// Wait for the document to complete loading and compute the
// timestamp of the last visible change.
calculator.attemptMeasurement().then(timestamp => {
    console.log(timestamp);
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

## Testing

You can run all tests together with:

```
$ yarn test
```

### Testing with Jest

To run only jest unit tests:

```
$ yarn test:unit
```


### Testing with Playwright

Before running any playwright tests, you will need to install the default set of browsers:

```
$ npx playwright install
```

Run test suite:

```
$ yarn test:e2e
```

To manually test pages, start the test server.

```
$ yarn test:server
```

Then navigate to a test case in your favorite browser.  e.g. http://localhost:3000/test/ajax-mutation/
