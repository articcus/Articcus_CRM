<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    use AuthorizesOwnership;

    public function index(Request $request)
    {
        $query = Contact::query()->with('company', 'owner')->latest();
        $this->scopeToOwner($query, $request);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($companyId = $request->query('company_id')) {
            $query->where('company_id', $companyId);
        }

        $perPage = (int) $request->query('per_page', 15);
        if ($perPage < 1 || $perPage > 200) {
            $perPage = 15;
        }

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => ['nullable', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
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

        $contact = Contact::create($data);

        return response()->json($contact->load('company'), 201);
    }

    public function show(Request $request, Contact $contact)
    {
        $this->authorizeOwner($request, $contact);

        return response()->json($contact->load('company', 'deals'));
    }

    public function update(Request $request, Contact $contact)
    {
        $this->authorizeOwner($request, $contact);

        $validator = Validator::make($request->all(), [
            'company_id' => ['nullable', 'exists:companies,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
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

        $contact->update($data);

        return response()->json($contact->load('company'));
    }

    public function destroy(Request $request, Contact $contact)
    {
        $this->authorizeOwner($request, $contact);

        $contact->delete();

        return response()->json(null, 204);
    }
}
