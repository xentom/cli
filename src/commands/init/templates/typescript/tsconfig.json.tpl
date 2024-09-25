{
  "compilerOptions": {
    // Enable latest features
    "lib": ["ES2022", "DOM"],
    "target": "ES2022",
    "module": "ES2022",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,

    // Bundler mode
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "dist/types",

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,

    // Some stricter flags (disabled by default)
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false,

    // Imports aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
