<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class InvitationController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        $invitations = Invitation::query()
            ->with('inviter')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($invitations);
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', 'in:admin,rep'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Someone who already has an account doesn't need to register again — inviting
        // their email just grants them that role directly (e.g. promoting a rep to admin
        // so they can manage team-wide work alongside their own).
        $existingUser = User::where('email', $request->email)->first();

        if ($existingUser) {
            $existingUser->update(['role' => $request->role]);

            return response()->json(['type' => 'role_updated', 'user' => $existingUser]);
        }

        $invitation = Invitation::create([
            'email' => $request->email,
            'role' => $request->role,
            'token' => Str::random(40),
            'invited_by' => $request->user()->id,
            'expires_at' => Carbon::now()->addDays(7),
        ]);

        return response()->json(['type' => 'invitation', ...$invitation->load('inviter')->toArray()], 201);
    }

    public function showByToken(string $token)
    {
        $invitation = Invitation::where('token', $token)->first();

        if (! $invitation) {
            return response()->json(['valid' => false, 'reason' => 'This invite link is invalid.'], 404);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['valid' => false, 'reason' => 'This invite has already been used.'], 410);
        }

        if ($invitation->isExpired()) {
            return response()->json(['valid' => false, 'reason' => 'This invite has expired.'], 410);
        }

        return response()->json([
            'valid' => true,
            'email' => $invitation->email,
            'role' => $invitation->role,
        ]);
    }

    public function destroy(Request $request, Invitation $invitation)
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        $invitation->delete();

        return response()->json(null, 204);
    }
}
