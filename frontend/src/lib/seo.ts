import { useEffect } from "react";

function upsertMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function upsertCanonical(path: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = `${window.location.origin}${path}`;
}

/** Título, descripción y canónica de cada ruta para que Google la indexe bien. */
export function usePageSeo(title: string, description: string, canonicalPath: string) {
  useEffect(() => {
    document.title = title;
    upsertMeta("description", description);
    upsertCanonical(canonicalPath);
  }, [title, description, canonicalPath]);
}
