declare module "*.mdx" {
  import type { FC } from "react";

  /** Frontmatter exported as a named `meta` object from the MDX file. */
  export const meta: import("@/lib/posts").PostMeta;

  const MDXContent: FC<Record<string, unknown>>;
  export default MDXContent;
}
