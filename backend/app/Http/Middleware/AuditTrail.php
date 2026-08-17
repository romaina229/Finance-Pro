<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuditTrail
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)
            && $request->user()
            && $request->route('organization')
            && ! Str::contains($request->path(), '/audit-logs')) {
            $organization = $request->route('organization');
            $organizationId = is_object($organization) ? $organization->getKey() : $organization;
            $route = $request->route();
            $entity = $route?->parameter('project') ?? $route?->parameter('expense') ?? $route?->parameter('revenue')
                ?? $route?->parameter('document') ?? $route?->parameter('bankAccount') ?? $route?->parameter('cashRegister');
            AuditLog::create([
                'organization_id' => $organizationId,
                'user_id' => $request->user()->id,
                'action' => Str::lower($request->method()).'.'.Str::replace('/', '.', $request->route()?->uri() ?? $request->path()),
                'entity_type' => is_object($entity) ? class_basename($entity) : null,
                'entity_id' => is_object($entity) && method_exists($entity, 'getKey') ? $entity->getKey() : (is_string($entity) ? $entity : null),
                'metadata' => ['status' => $response->status()],
                'ip_address' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 500),
            ]);
        }

        return $response;
    }
}
