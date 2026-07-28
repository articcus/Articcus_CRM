<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Kreait\Firebase\JWT\Error\IdTokenVerificationFailed;
use Kreait\Firebase\JWT\IdTokenVerifier;

class AuthController extends Controller
{
    public function __construct(private readonly IdTokenVerifier $firebaseTokenVerifier) {}

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('articcus-crm')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('articcus-crm')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function firebase(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_token' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $verifiedToken = $this->firebaseTokenVerifier->verifyIdToken($request->id_token);
        } catch (IdTokenVerificationFailed $e) {
            return response()->json(['message' => 'Invalid Firebase token'], 401);
        }

        $claims = $verifiedToken->payload();
        $firebaseUid = $claims['sub'];
        $email = $claims['email'];
        $name = $claims['name'] ?? explode('@', $email)[0];

        $user = User::where('firebase_uid', $firebaseUid)->first()
            ?? User::where('email', $email)->first();

        if ($user) {
            if (! $user->firebase_uid) {
                $user->update(['firebase_uid' => $firebaseUid]);
            }
        } else {
            $user = User::create([
                'firebase_uid' => $firebaseUid,
                'name' => $name,
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
            ]);
        }

        $token = $user->createToken('articcus-crm')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token]);
    }
}
