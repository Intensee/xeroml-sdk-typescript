# @xeroml/sdk

Official TypeScript SDK for the XeroML API.

## Install

```bash
npm install @xeroml/sdk
```

## Usage

```typescript
import { XeroML } from "@xeroml/sdk";

const client = new XeroML({ apiKey: "xml_..." });

const result = await client.classify({
  text: "I want to cancel my subscription",
});
```

## Development

```bash
pnpm install
pnpm build         # compile
pnpm typecheck     # type check
pnpm test          # run tests
```
