#!/usr/bin/env node
// workaround for pnpm install warning "Failed to create bin"
// when dist/cli.js does not-yet exist
import "../dist/cli.js"
