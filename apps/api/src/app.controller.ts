import { Controller, Get } from "@nestjs/common";

/**
 * Liveness probe for the containerized API. The global prefix (`api`) makes this
 * resolve to `GET /api/health`, which is what docker-compose's healthcheck polls.
 * Kept dependency-free so it answers even if downstream services are unhealthy —
 * a deeper readiness check would live in a separate endpoint.
 */
@Controller("health")
export class AppController {
  @Get()
  check(): { status: "ok"; uptime: number } {
    return { status: "ok", uptime: process.uptime() };
  }
}
