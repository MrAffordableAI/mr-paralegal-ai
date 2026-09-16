import { createFileRoute } from "@tanstack/react-router";
import { ParalegalApp } from "@/components/paralegal-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ParalegalApp />;
}
