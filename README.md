# react-fast

[![version](https://img.shields.io/npm/v/react-fast?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-fast)
[![downloads](https://img.shields.io/npm/dt/react-fast.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-fast)

## Install

```bash
npm install react-fast
```

## Usage

```ts
import { greet, add } from "react-fast";

greet("world"); // "Hello, world!"
add(1, 2); // 3
```

### Browser (IIFE)

```html
<script src="https://unpkg.com/react-fast/dist/index.iife.js"></script>
<script>
  ReactFast.greet("world"); // "Hello, world!"
</script>
```

## Development

This is a pnpm monorepo using [vite-plus](https://github.com/nicolo-ribaudo/vite-plus) for building and [changesets](https://github.com/changesets/changesets) for versioning.

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint & Format

```bash
pnpm lint
pnpm format
```

### Release

```bash
pnpm changeset       # create a changeset
pnpm version         # bump versions
pnpm release         # build + publish
```

## Contributing

Pull requests are welcome! Please run `pnpm check` before submitting.

## License

MIT
