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
