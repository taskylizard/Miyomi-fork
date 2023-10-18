import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContentLoader } from "vitepress";
import type { ContentData, SiteConfig } from "vitepress";
import { type SatoriOptions, satoriVue } from "x-satori/vue";
import { renderAsync } from "@resvg/resvg-js";
import { satoriConfig } from "./satoriConfig";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function generateImages(config: SiteConfig) {
  const pages = await createContentLoader("**/*.md", { excerpt: true }).load();
  const template = await readFile(
    resolve(__dirname, "../theme/components/OgImageTemplate.vue"),
    "utf-8",
  );

  const filteredPages = pages.filter((p) => p.frontmatter.image === undefined);

  for (const page of filteredPages) {
    await generateImage({
      page,
      template,
      outDir: config.outDir,
    });
  }
}

interface GenerateImagesOptions {
  page: ContentData;
  template: string;
  outDir: string;
}

function getDir(url: string) {
  if (url.startsWith("/glossary/")) {
    return "Glossary";
  } else if (url.startsWith("/guides/")) {
    return "Guide";
  }

  // Means we are at root.
  return undefined;
}

async function generateImage({ page, template, outDir }: GenerateImagesOptions) {
  const { frontmatter, url } = page;

  const options: SatoriOptions = {
    ...satoriConfig,
    props: {
      title:
        frontmatter.layout === "home"
          ? frontmatter.hero.name ?? frontmatter.title
          : frontmatter.customMetaTitle ?? frontmatter.title,
      description:
        frontmatter.layout === "home"
          ? frontmatter.hero.tagline ?? frontmatter.description
          : frontmatter.description,
      dir: getDir(url),
    },
  };

  const svg = await satoriVue(options, template);

  const render = await renderAsync(svg);

  const outputFolder = resolve(outDir, url.substring(1), "__og_image__");
  const outputFile = resolve(outputFolder, "og.png");

  await mkdir(outputFolder, { recursive: true });

  return await writeFile(outputFile, render.asPng());
}
