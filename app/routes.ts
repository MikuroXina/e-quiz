import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("courses/:course_id", "routes/course.tsx"),
  route("log_in", "routes/log-in.tsx"),
  route("callback", "routes/callback.tsx"),
] satisfies RouteConfig;
