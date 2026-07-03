import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "e-Quiz" }, { name: "description", content: "Home - e-Quiz" }];
}

export default function Home() {
  return <div>Hello, world!</div>;
}
