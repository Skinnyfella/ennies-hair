import { createFileRoute } from "@tanstack/react-router";
import EnniesHairApp from "@/components/EnniesHair";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ENNIE'S HAIR — Premium Wigs, Bundles & Braiding Hair" },
      {
        name: "description",
        content:
          "Luxury 100% virgin & remy hair collection. Wigs, bundles, braiding hair and accessories — fast nationwide delivery from Lagos, Nigeria.",
      },
      { property: "og:title", content: "ENNIE'S HAIR — Confidence. Beauty. Luxury." },
      { property: "og:description", content: "Premium hair collections for the modern woman." },
    ],
  }),
  component: Index,
});

function Index() {
  return <EnniesHairApp />;
}
