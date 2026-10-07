<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesOwnership;
use App\Models\Activity;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    use AuthorizesOwnership;

    private const OPEN_STAGES = ['new', 'contacted', 'qualified', 'proposal'];

    private const ALL_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

    private const LEAD_STATUSES = ['mql', 'sql', 'opportunity'];

    // Combined lead-to-deal funnel, in stage order. Deal stages 'new'/'contacted' don't get
    // their own funnel row (they're pre-qualification, same as having an Opportunity) so they
    // fold into the 'opportunity' rank rather than inflating a stage the funnel doesn't show.
    private const FUNNEL_STAGES = ['mql', 'sql', 'opportunity', 'qualified', 'proposal', 'won'];

    private const FUNNEL_RANKS = [
        'mql' => 0,
        'sql' => 1,
        'opportunity' => 2,
        'new' => 2,
        'contacted' => 2,
        'qualified' => 3,
        'proposal' => 4,
        'won' => 5,
    ];

    public function index(Request $request)
    {
        $deals = fn () => $this->scopeToOwner(Deal::query(), $request);
        $activities = fn () => $this->scopeToOwner(Activity::query(), $request);
        $contacts = fn () => $this->scopeToOwner(Contact::query(), $request);

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

        $leadFunnel = collect(self::LEAD_STATUSES)->map(fn ($status) => [
            'status' => $status,
            'count' => $contacts()->where('lead_status', $status)->count(),
        ]);

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
            'lead_funnel' => $leadFunnel,
            'revenue_by_rep' => $revenueByRep,
            'monthly_revenue' => $monthlyRevenue,
            'overdue_tasks_count' => $overdueTasks,
            'upcoming_tasks_count' => $upcomingTasks,
        ]);
    }

    /**
     * The full MQL -> SQL -> Opportunity -> Qualified -> Proposal -> Won funnel.
     *
     * Counts are cumulative ("reached this stage or later"), computed from each contact's
     * current lead_status and the most-advanced non-lost deal they have — this schema has no
     * stage-history log, so a contact's *current* furthest position is the best available proxy
     * for "how far they got". Lost deals are excluded from that reach calculation (we can't know
     * how far a lost deal got before it was marked lost) and are reported separately instead.
     */
    public function funnel(Request $request)
    {
        $contacts = $this->scopeToOwner(Contact::query(), $request)
            ->with(['deals' => fn ($q) => $q->where('stage', '!=', 'lost')])
            ->get();

        $reached = array_fill(0, count(self::FUNNEL_STAGES), 0);

        foreach ($contacts as $contact) {
            $rank = self::FUNNEL_RANKS[$contact->lead_status] ?? 0;
            foreach ($contact->deals as $deal) {
                $rank = max($rank, self::FUNNEL_RANKS[$deal->stage] ?? $rank);
            }
            for ($i = 0; $i <= $rank; $i++) {
                $reached[$i]++;
            }
        }

        $deals = fn () => $this->scopeToOwner(Deal::query(), $request);

        $valueByStage = collect(['qualified', 'proposal', 'won'])->mapWithKeys(
            fn ($stage) => [$stage => (float) $deals()->where('stage', $stage)->sum('value')]
        );

        $rows = collect(self::FUNNEL_STAGES)->map(fn ($stage, $i) => [
            'stage' => $stage,
            'count' => $reached[$i],
            'value' => $valueByStage->get($stage),
        ])->values()->all();

        foreach ($rows as $i => &$row) {
            $next = $rows[$i + 1] ?? null;
            $row['conversion_to_next'] = $next && $row['count'] > 0
                ? round($next['count'] / $row['count'] * 100, 1)
                : null;
        }
        unset($row);

        $lost = $deals()->where('stage', 'lost')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(value), 0) as value')
            ->first();

        return response()->json([
            'stages' => $rows,
            'total_contacts' => $contacts->count(),
            'lost_count' => (int) $lost->count,
            'lost_value' => (float) $lost->value,
        ]);
    }
}
