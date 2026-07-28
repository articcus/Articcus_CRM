<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('customers')) {
            return;
        }

        $companyIdsByName = [];

        foreach (DB::table('customers')->orderBy('id')->cursor() as $customer) {
            $companyId = null;

            if (filled($customer->company)) {
                $companyId = $companyIdsByName[$customer->company] ??= DB::table('companies')->insertGetId([
                    'name' => $customer->company,
                    'owner_id' => $customer->user_id,
                    'created_at' => $customer->created_at,
                    'updated_at' => $customer->updated_at,
                ]);
            }

            DB::table('contacts')->insert([
                'company_id' => $companyId,
                'owner_id' => $customer->user_id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'notes' => $customer->notes,
                'created_at' => $customer->created_at,
                'updated_at' => $customer->updated_at,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data-only migration; not reversible (customers table is dropped by a later migration).
    }
};
