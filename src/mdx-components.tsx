import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import {
  AgentLoop,
  EvalFlywheel,
  PromptVsTune,
  RagPipeline,
  RequestPath,
} from "@/components/diagrams";

/**
 * Components available to every MDX essay without an explicit import.
 * Prose styling lives in globals.css; this file only adds behaviour.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Internal links go through the router; external ones get safe attrs.
    a: ({ href = "", children, ...props }) => {
      const isInternal = href.startsWith("/") || href.startsWith("#");
      if (isInternal) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
    RequestPath,
    RagPipeline,
    AgentLoop,
    EvalFlywheel,
    PromptVsTune,
    ...components,
  };
}
