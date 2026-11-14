import { StrictMode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { MemoryRouter } from "react-router";
import { App } from "./App";
import { renderedTitle, resetRenderedTitle } from "./site/title";

export async function render(pathname: string, basename: string) {
  resetRenderedTitle();
  const prefix = basename === "/" ? "" : basename.replace(/\/$/, "");
  const location = `${prefix}${pathname === "/" ? "/" : pathname}`;
  const errors: unknown[] = [];
  const { prelude, postponed } = await prerenderToNodeStream(
    <StrictMode>
      <MemoryRouter initialEntries={[location]} basename={prefix || "/"}>
        <App />
      </MemoryRouter>
    </StrictMode>,
    {
      onError(error) {
        errors.push(error);
      },
    },
  );
  if (postponed) throw new Error(`prerender incomplete: ${pathname}`);
  if (errors.length > 0) throw errors[0];
  const html = await readStream(prelude);
  return { html, title: renderedTitle() };
}

function readStream(stream: NodeJS.ReadableStream) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}
