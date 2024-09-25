{
  "$schema": "https://cdn.xentom.com/schemas/package.json",
  "name": "{{ name }}",
  "version": "0.0.1",
  "organization": "{{ organization }}",
  "source": "./src/index.ts",
  "logo": "./assets/logo.png",
  "scripts": {
    "dev": "xentom dev",
    "build": "xentom build",
    "publish": "xentom publish"
  },
  "dependencies": {
    "@tabler/icons-react": "^3.17.0"
  },
  "devDependencies": {
    "@types/bun": "^1.1.9",
    "typescript": "^5.6.2"
  },
  "peerDependencies": {
    "@xentom/integration": "^0.0.16"
  }
}