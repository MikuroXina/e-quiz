import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("courses/:course_id", "routes/course.tsx"),
  route("courses/:course_id/contents/:content_id", "routes/content.tsx"),
  route("invite", "routes/invite.tsx"),
  route("log_in", "routes/log-in.tsx"),
  route("log_out", "routes/log-out.tsx"),
  route("callback", "routes/callback.tsx"),
] satisfies RouteConfig;
