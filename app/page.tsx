/**
 * The root.
 *
 * ChromeRoot opens the map automatically whenever the visitor isn't on a channel, so
 * landing here means landing on the map. This page is the backdrop behind it.
 *
 * OPEN QUESTION #4 in the context folder: whether first-ever arrival should instead
 * be a specific channel, a random one, or a title/boot screen for the site itself.
 * Whatever we pick lands here.
 */
export default function Home() {
  return <div className="h-full w-full bg-[#05070c]" />;
}
