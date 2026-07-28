<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait AuthorizesOwnership
{
    /**
     * Reps only see their own records; admins see everything.
     */
    protected function scopeToOwner(Builder $query, Request $request): Builder
    {
        if ($request->user()->role !== 'admin') {
            $query->where('owner_id', $request->user()->id);
        }

        return $query;
    }

    /**
     * Reps may only modify records they own; admins may modify any.
     */
    protected function authorizeOwner(Request $request, Model $model): void
    {
        if ($request->user()->role !== 'admin' && $model->owner_id !== $request->user()->id) {
            abort(403, 'You do not have access to this record.');
        }
    }
}
