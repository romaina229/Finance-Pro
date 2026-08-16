<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProjectController extends Controller
{
    public function index(Request $request, Organization $organization)
    {
        $projects = $organization->projects()
            ->with(['donor:id,name', 'projectManager:id,full_name'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $projects]);
    }

    public function show(Request $request, Organization $organization, Project $project)
    {
        abort_if($project->organization_id !== $organization->id, 404);

        return response()->json(['data' => $project->load(['donor', 'projectManager'])]);
    }

    public function store(Request $request, Organization $organization)
    {
        $validator = Validator::make($request->all(), $this->rules($organization, null));

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $project = $organization->projects()->create($validator->validated());

        return response()->json(['data' => $project->load(['donor', 'projectManager'])], 201);
    }

    public function update(Request $request, Organization $organization, Project $project)
    {
        abort_if($project->organization_id !== $organization->id, 404);

        $validator = Validator::make($request->all(), $this->rules($organization, $project, true));

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $project->update($validator->validated());

        return response()->json(['data' => $project->fresh(['donor', 'projectManager'])]);
    }

    public function destroy(Request $request, Organization $organization, Project $project)
    {
        abort_if($project->organization_id !== $organization->id, 404);

        // À affiner aux étapes suivantes : bloquer si des dépenses/recettes existent déjà.
        $project->delete();

        return response()->json(['message' => 'Projet supprimé.']);
    }

    private function rules(Organization $organization, ?Project $project, bool $isUpdate = false): array
    {
        $sometimesOrRequired = $isUpdate ? 'sometimes' : 'required';
        $codeUnique = 'unique:projects,code,' . ($project?->id ?? 'NULL') . ',id,organization_id,' . $organization->id;

        return [
            'donor_id'            => ['nullable', 'uuid', 'exists:donors,id'],
            'code'                => [$sometimesOrRequired, 'string', 'max:30', $codeUnique],
            'name'                => [$sometimesOrRequired, 'string', 'max:255'],
            'description'         => ['nullable', 'string'],
            'total_budget'        => ['nullable', 'numeric', 'min:0'],
            'currency'            => ['nullable', 'string', 'size:3', 'exists:currencies,code'],
            'start_date'          => ['nullable', 'date'],
            'end_date'            => ['nullable', 'date', 'after_or_equal:start_date'],
            'status'              => ['nullable', 'in:draft,active,suspended,closed'],
            'project_manager_id'  => ['nullable', 'uuid', 'exists:users,id'],
        ];
    }
}
