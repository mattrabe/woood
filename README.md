# Woood, woood, good ol' woood.

## Getting started

1. `cp .env.local.example .env.local`, fill with proper values
1. `npm install`
1. `npm run dev`

### Verbose debug logging

Verbose debug logging is facilitated by the [debug](https://www.npmjs.com/package/debug) package, and is turned off by default.

Many 3rd party packages utilize the debug package.

To enable verbose logging, set the `DEBUG` variable in .env to include the namespace(s) that you want verbose logging for.

#### Examples:

* Everything: `DEBUG=*` (noisy!)
* Everything except Wood component: `DEBUG=*,-wood:*`
* Only Wood component: `DEBUG=wood`
* Only Drag feature from Wood component: `DEBUG=wood:drag`
