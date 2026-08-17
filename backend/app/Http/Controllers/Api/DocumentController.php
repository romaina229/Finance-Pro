<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function index(Organization $organization)
    {
        return response()->json([
            'data' => Document::where('organization_id', $organization->id)
                ->with('uploader:id,name,email')
                ->latest()
                ->paginate(25),
        ]);
    }

    public function store(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,csv'],
            'description' => ['nullable', 'string', 'max:2000'],
            'documentable_type' => ['nullable', 'string', Rule::in(['project', 'expense', 'revenue', 'organization'])],
            'documentable_id' => ['nullable', 'uuid'],
        ]);

        $file = $request->file('file');
        $path = $file->store('organizations/' . $organization->id . '/documents', 'local');

        $document = Document::create([
            'organization_id' => $organization->id,
            'uploaded_by' => $request->user()->id,
            'original_name' => $file->getClientOriginalName(),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'documentable_type' => $validated['documentable_type'] ?? null,
            'documentable_id' => $validated['documentable_id'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json(['data' => $document->load('uploader:id,name,email')], 201);
    }

    public function show(Organization $organization, Document $document)
    {
        $this->assertBelongsToOrganization($document, $organization);
        return response()->json(['data' => $document->load('uploader:id,name,email')]);
    }

    public function download(Organization $organization, Document $document)
    {
        $this->assertBelongsToOrganization($document, $organization);
        abort_unless(Storage::disk($document->disk)->exists($document->path), 404, 'Fichier introuvable.');

        return Storage::disk($document->disk)->download($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type ?? 'application/octet-stream',
        ]);
    }

    public function destroy(Organization $organization, Document $document)
    {
        $this->assertBelongsToOrganization($document, $organization);
        Storage::disk($document->disk)->delete($document->path);
        $document->delete();
        return response()->noContent();
    }

    private function assertBelongsToOrganization(Document $document, Organization $organization): void
    {
        abort_unless($document->organization_id === $organization->id, 404);
    }
}
