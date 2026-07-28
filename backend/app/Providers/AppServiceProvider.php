<?php

namespace App\Providers;

use Beste\Cache\InMemoryCache;
use Illuminate\Support\ServiceProvider;
use Kreait\Firebase\JWT\IdTokenVerifier;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(IdTokenVerifier::class, function () {
            return IdTokenVerifier::createWithProjectIdAndCache(
                config('services.firebase.project_id') ?: 'missing-firebase-project-id',
                new InMemoryCache,
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
