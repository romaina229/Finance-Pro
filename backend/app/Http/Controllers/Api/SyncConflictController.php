<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\SyncConflict;
use Illuminate\Http\Request;

class SyncConflictController extends Controller
{
    public function index(Request $request, Organization $organization)
    {
        $conflicts = SyncConflict::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'pending')
            ->latest()
            ->paginate(25);

        // Retourne un tableau plat sous 'data' (cohérent avec les autres endpoints
        // de la plateforme) plutôt que le paginator imbriqué, qui cassait le frontend
        // (services/conflicts.ts attend data.data comme tableau, pas comme objet paginator).
        return response()->json([
            'data' => $conflicts->items(),
            'meta' => ['current_page' => $conflicts->currentPage(), 'last_page' => $conflicts->lastPage(), 'total' => $conflicts->total()],
        ]);
    }

    public function store(Request $request, Organization $organization)
    {
        $data = $request->validate([
            'mutation_id' => ['required', 'string', 'max:255'],
            'method' => ['required', 'string', 'max:10'],
            'url' => ['required', 'string', 'max:2000'],
            'local_payload' => ['nullable', 'array'],
            'server_payload' => ['nullable', 'array'],
        ]);

        $conflict = SyncConflict::updateOrCreate(
            ['organization_id' => $organization->id, 'mutation_id' => $data['mutation_id']],
            [...$data, 'user_id' => $request->user()->id, 'status' => 'pending', 'resolved_at' => null, 'resolved_by' => null]
        );

        return response()->json(['data' => $conflict], 201);
    }

    public function resolve(Request $request, Organization $organization, SyncConflict $conflict)
    {
        abort_unless((string) $conflict->organization_id === (string) $organization->id, 404);

        $data = $request->validate([
            'resolution' => ['required', 'in:keep_local,keep_server,manual'],
            'payload' => ['nullable', 'array'],
        ]);

        $conflict->update([
            'status' => $data['resolution'],
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $conflict->fresh()]);
    }
}
