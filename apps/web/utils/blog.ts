import { cache } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import { getMDXContent } from "@/app/_actions/mdx";
import { ReactElement, JSXElementConstructor } from "react";

export type PostMetadata = {
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  image?: string;
  author: string;
  tags: string;
};

export type BlogPost = {
  metadata: PostMetadata;
  slug: string;
  content: ReactElement<any, string | JSXElementConstructor<any>>;
};

export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  const posts = await getMDXContent("content/blog");

  const parsedPosts = await Promise.all(
    posts.map(async ({ slug, content }) => {
      const { frontmatter, content: mdxContent } = await compileMDX<PostMetadata>({
        source: content,
        options: { parseFrontmatter: true },
      });

      return {
        metadata: frontmatter,
        slug,
        content: mdxContent,
      };
    })
  );

  return parsedPosts.sort((a, b) =>
    new Date(b.metadata.publishedAt) > new Date(a.metadata.publishedAt) ? 1 : -1
  );
});
