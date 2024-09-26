# Xentom CLI

[![Release](https://img.shields.io/github/v/release/xentom/cli)](https://github.com/xentom/cli/releases/latest)
[![Build](https://github.com/xentom/cli/actions/workflows/release.yml/badge.svg)](https://github.com/xentom/cli/actions/workflows/release.yml)

A command-line interface (CLI) for executing workflows and managing workflow integrations. This tool is designed to help you streamline workflow execution, create workflow integrations efficiently, and use utility functions that simplify the development process for integrations.

![Xentom CLI Screenshot](https://github.com/user-attachments/assets/9a272339-ce49-40cb-bbb6-d1c8670a7ac5)

## Installation

### Linux and macOS

```bash
curl -fsSL https://xentom.com/install | bash
```

### Windows

```ps1
irm xentom.com/install.ps1 | iex
```

## Upgrade

To upgrade to the latest version of the Xentom CLI, run:

```bash
xentom upgrade
```

## Canary Builds

Xentom automatically releases an untested canary build with every commit to the main branch. To update to the latest canary version, use the following command:

```bash
xentom upgrade --canary
```

The canary build allows you to test new features and bug fixes ahead of the stable release.

## Local Development

1. Make sure to have [Bun](https://bun.sh/) installed on your machine.

2. Clone the repository

```bash
git clone https://github.com/xentom/cli
cd cli
```

3. Install dependencies

```bash
bun install
```

4. Build the CLI

```bash
bun run build
```

5. Run the CLI

```bash
~/.bin/xentom --help
```

## Documentation

Please checkout our Documentation page: [xentom.com/docs/cli](https://xentom.com/docs/cli)
