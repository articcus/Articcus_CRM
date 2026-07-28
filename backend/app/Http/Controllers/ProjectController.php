<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    public function index()
    {
        $projects = Project::query()
            ->withCount([
                'deals',
                'deals as open_deals_count' => fn ($q) => $q->whereNotIn('stage', ['won', 'lost']),
            ])
            ->orderBy('name')
            ->get();

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:7'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $project = Project::create($validator->validated());

        return response()->json($project, 201);
    }

    public function show(Project $project)
    {
        $project->loadCount([
            'deals',
            'deals as open_deals_count' => fn ($q) => $q->whereNotIn('stage', ['won', 'lost']),
        ]);
        $project->load([
            'deals' => fn ($q) => $q->with('contact.company', 'owner')->latest(),
        ]);

        return response()->json($project);
    }

    public function update(Request $request, Project $project)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:7'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $project->update($validator->validated());

        return response()->json($project);
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return response()->json(null, 204);
    }
}
