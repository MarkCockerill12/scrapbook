import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAestheticComponent } from "@/aesthetics";
import { CanvasStage } from "@/components/CanvasStage";
import { ChannelOffline } from "@/components/ChannelOffline";
import { ALL_SLUGS, getAesthetic } from "@/lib/registry";

export function generateStaticParams() {
  return ALL_SLUGS.map((aesthetic) => ({ aesthetic }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[aesthetic]">): Promise<Metadata> {
  const { aesthetic: slug } = await params;
  const a = getAesthetic(slug);
  if (!a) return { title: "ScrapBook" };
  return {
    title: `${a.name} · ScrapBook`,
    description: a.tagline,
  };
}

export default async function AestheticPage({ params }: PageProps<"/[aesthetic]">) {
  const { aesthetic: slug } = await params;
  const a = getAesthetic(slug);
  if (!a) notFound();

  const Page = getAestheticComponent(a.slug);

  return (
    <CanvasStage
      width={a.canvas.width}
      height={a.canvas.height}
      mode={a.canvas.mode}
      letterbox="#000"
    >
      {Page ? <Page /> : <ChannelOffline aesthetic={a} />}
    </CanvasStage>
  );
}
