/// <reference types="vite/client" />

declare module "*.md" {
  const source: string;
  export default source;
}
