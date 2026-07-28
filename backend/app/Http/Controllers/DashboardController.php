<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Models\Activity;
use App\Models\Deal;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    use AuthorizesOwnership;

    private const OPEN_STAGES = ['new', 'contacted', 'qualified', 'proposal'];

    private const ALL_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

    public function index(Request $request)
    {
        $deals = fn () => $this->scopeToOwner(Deal::query(), $request);
        $activities = fn () => $this->scopeToOwner(Activity::query(), $request);

        $openPipeline = $deals()->whereIn('stage', self::OPEN_STAGES)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(value), 0) as value')
            ->first();

        $wonCount = $deals()->where('stage', 'won')->count();
        $lostCount = $deals()->where('stage', 'lost')->count();
        $winRate = ($wonCount + $lostCount) > 0
            ? round($wonCount / ($wonCount + $lostCount), 4)
            : null;

        $monthStart = Carbon::now()->startOfMonth();
        $wonThisMonth = $deals()->where('stage', 'won')
            ->where('closed_at', '>=', $monthStart)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(value), 0) as value')
            ->first();

        $pipelineByStage = collect(self::ALL_STAGES)->map(function ($stage) use ($deals) {
            $row = $deals()->where('stage', $stage)
                ->selectRaw('COUNT(*) as count, COALESCE(SUM(value), 0) as value')
                ->first();

            return [
                'stage' => $stage,
                'count' => (int) $row->count,
                'value' => (float) $row->value,
            ];
        });

        $revenueByRep = $deals()
            ->where('stage', 'won')
            ->join('users', 'users.id', '=', 'deals.owner_id')
            ->selectRaw('users.id as owner_id, users.name as owner_name, COUNT(*) as won_count, COALESCE(SUM(deals.value), 0) as won_value')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('won_value')
            ->get()
            ->map(fn ($row) => [
                'owner_id' => $row->owner_id,
                'owner_name' => $row->owner_name,
                'won_count' => (int) $row->won_count,
                'won_value' => (float) $row->won_value,
            ]);

        $monthlyRevenue = collect(range(5, 0))->map(function ($monthsAgo) use ($deals) {
            $start = Carbon::now()->subMonths($monthsAgo)->startOfMonth();
            $end = $start->copy()->endOfMonth();

            $value = $deals()->where('stage', 'won')
                ->whereBetween('closed_at', [$start, $end])
                ->sum('value');

            return [
                'month' => $start->format('Y-m'),
                'label' => $start->format('M'),
                'value' => (float) $value,
            ];
        })->values();

        $overdueTasks = $activities()->whereNull('completed_at')
            ->where('due_at', '<', now())
            ->count();

        $upcomingTasks = $activities()->whereNull('completed_at')
            ->whereBetween('due_at', [now(), now()->addDays(7)])
            ->count();

        return response()->json([
            'open_pipeline_value' => (float) $openPipeline->value,
            'open_pipeline_count' => (int) $openPipeline->count,
            'win_rate' => $winRate,
            'won_count' => $wonCount,
            'lost_count' => $lostCount,
            'won_this_month_value' => (float) $wonThisMonth->value,
            'won_this_month_count' => (int) $wonThisMonth->count,
            'pipeline_by_stage' => $pipelineByStage,
            'revenue_by_rep' => $revenueByRep,
            'monthly_revenue' => $monthlyRevenue,
            'overdue_tasks_count' => $overdueTasks,
            'upcoming_tasks_count' => $upcomingTasks,
        ]);
    }
}
