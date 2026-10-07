<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ActivityController extends Controller
{
    use AuthorizesOwnership;

    private const TYPES = ['call', 'email', 'meeting', 'task'];

    public function index(Request $request)
    {
        $query = Activity::query()->with('contact.company', 'deal.project', 'deal.owner', 'owner')->latest();
        $this->scopeToOwner($query, $request);

        if ($contactId = $request->query('contact_id')) {
            $query->where('contact_id', $contactId);
        }

        if ($dealId = $request->query('deal_id')) {
            $query->where('deal_id', $dealId);
        }

        if ($request->query('status') === 'pending') {
            $query->whereNull('completed_at');
        } elseif ($request->query('status') === 'completed') {
            $query->whereNotNull('completed_at');
        }

        return response()->json($query->paginate(200));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'contact_id' => ['required', 'exists:contacts,id'],
            'deal_id' => ['nullable', 'exists:deals,id'],
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'subject' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'due_at' => ['nullable', 'date'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['owner_id'] = $request->user()->role === 'admin' && $request->filled('owner_id')
            ? $data['owner_id']
            : $request->user()->id;

        $activity = Activity::create($data);

        return response()->json($activity->load('contact.company', 'deal.project', 'deal.owner', 'owner'), 201);
    }

    public function update(Request $request, Activity $activity)
    {
        $this->authorizeOwner($request, $activity);

        $validator = Validator::make($request->all(), [
            'contact_id' => ['sometimes', 'required', 'exists:contacts,id'],
            'deal_id' => ['nullable', 'exists:deals,id'],
            'type' => ['sometimes', 'required', 'in:'.implode(',', self::TYPES)],
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'due_at' => ['nullable', 'date'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if ($request->user()->role !== 'admin') {
            unset($data['owner_id']);
        }

        $activity->update($data);

        return response()->json($activity->load('contact.company', 'deal.project', 'deal.owner', 'owner'));
    }

    public function complete(Request $request, Activity $activity)
    {
        $this->authorizeOwner($request, $activity);

        $activity->update([
            'completed_at' => $activity->completed_at ? null : now(),
        ]);

        return response()->json($activity->load('contact.company', 'deal.project', 'deal.owner', 'owner'));
    }

    public function destroy(Request $request, Activity $activity)
    {
        $this->authorizeOwner($request, $activity);

        $activity->delete();

        return response()->json(null, 204);
    }
}
