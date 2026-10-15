import { createFileRoute } from "@tanstack/react-router";
import { Phone } from "@/components/deriva/phone";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Phone />;
}
