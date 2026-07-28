<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Models\Deal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DealController extends Controller
{
    use AuthorizesOwnership;

    private const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

    public function index(Request $request)
    {
        $query = Deal::query()->with('contact.company', 'owner', 'project')->latest();
        $this->scopeToOwner($query, $request);

        if ($stage = $request->query('stage')) {
            $query->where('stage', $stage);
        }

        if ($contactId = $request->query('contact_id')) {
            $query->where('contact_id', $contactId);
        }

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        return response()->json($query->paginate(100));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'contact_id' => ['required', 'exists:contacts,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:255'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'stage' => ['nullable', 'in:'.implode(',', self::STAGES)],
            'expected_close_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['owner_id'] = $request->user()->role === 'admin' && $request->filled('owner_id')
            ? $data['owner_id']
            : $request->user()->id;

        if (isset($data['stage']) && in_array($data['stage'], ['won', 'lost'], true)) {
            $data['closed_at'] = now();
        }

        $deal = Deal::create($data);

        return response()->json($deal->load('contact.company', 'project'), 201);
    }

    public function show(Request $request, Deal $deal)
    {
        $this->authorizeOwner($request, $deal);

        return response()->json($deal->load('contact.company', 'project'));
    }

    public function update(Request $request, Deal $deal)
    {
        $this->authorizeOwner($request, $deal);

        $validator = Validator::make($request->all(), [
            'contact_id' => ['sometimes', 'required', 'exists:contacts,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'stage' => ['nullable', 'in:'.implode(',', self::STAGES)],
            'expected_close_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if ($request->user()->role !== 'admin') {
            unset($data['owner_id']);
        }

        if (array_key_exists('stage', $data)) {
            $data['closed_at'] = in_array($data['stage'], ['won', 'lost'], true) ? now() : null;
        }

        $deal->update($data);

        return response()->json($deal->load('contact.company', 'project'));
    }

    public function updateStage(Request $request, Deal $deal)
    {
        $this->authorizeOwner($request, $deal);

        $validator = Validator::make($request->all(), [
            'stage' => ['required', 'in:'.implode(',', self::STAGES)],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $deal->update([
            'stage' => $request->stage,
            'closed_at' => in_array($request->stage, ['won', 'lost'], true) ? now() : null,
        ]);

        return response()->json($deal->load('contact.company', 'project'));
    }

    public function destroy(Request $request, Deal $deal)
    {
        $this->authorizeOwner($request, $deal);

        $deal->delete();

        return response()->json(null, 204);
    }
}
