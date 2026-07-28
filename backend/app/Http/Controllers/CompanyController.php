<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CompanyController extends Controller
{
    use AuthorizesOwnership;

    public function index(Request $request)
    {
        $query = Company::query()->with('owner')->latest();
        $this->scopeToOwner($query, $request);

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(15));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['owner_id'] = $request->user()->role === 'admin' && $request->filled('owner_id')
            ? $data['owner_id']
            : $request->user()->id;

        $company = Company::create($data);

        return response()->json($company, 201);
    }

    public function show(Request $request, Company $company)
    {
        $this->authorizeOwner($request, $company);

        return response()->json($company->load('contacts'));
    }

    public function update(Request $request, Company $company)
    {
        $this->authorizeOwner($request, $company);

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if ($request->user()->role !== 'admin') {
            unset($data['owner_id']);
        }

        $company->update($data);

        return response()->json($company);
    }

    public function destroy(Request $request, Company $company)
    {
        $this->authorizeOwner($request, $company);

        $company->delete();

        return response()->json(null, 204);
    }
}
