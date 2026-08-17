<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request, string $organization)
    {
        $query = AuditLog::query()
            ->where('organization_id', $organization)
            ->with('user:id,full_name')
            ->latest('created_at');

        if ($request->filled('action')) $query->where('action', $request->string('action'));
        if ($request->filled('user_id')) $query->where('user_id', $request->string('user_id'));
        if ($request->filled('from')) $query->whereDate('created_at', '>=', $request->date('from'));
        if ($request->filled('to')) $query->whereDate('created_at', '<=', $request->date('to'));

        $logs = $query->paginate(min($request->integer('per_page', 25), 100));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'metadata' => $log->metadata,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at,
                'user' => $log->user ? ['id' => $log->user->id, 'full_name' => $log->user->full_name] : null,
            ]),
            'meta' => ['current_page' => $logs->currentPage(), 'last_page' => $logs->lastPage(), 'total' => $logs->total()],
        ]);
    }
}
