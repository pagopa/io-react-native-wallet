# Commands

## Setup

```bash
yarn install    # Install dependencies
```

## Running the Example App

```bash
cd example
yarn install
yarn ios        # Run iOS simulator
yarn android    # Run Android (requires emulator running)
```

## Quality Checks

```bash
yarn tsc        # TypeScript type check
yarn lint       # ESLint + Prettier check
yarn test       # Run all tests
yarn test:dev   # Run tests without coverage
```

## Single Test File

```bash
jest path/to/file.test.ts
```

## Build

```bash
yarn prepare    # Build library (runs automatically before publish)
```
