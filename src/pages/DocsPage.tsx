import { useState } from 'react';
import { Card } from '@/components/ui';
import { BookOpen, Flag, ShieldAlert, RotateCcw, ScrollText, Code, Calendar, Users, FlaskConical, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { id: 'getting-started', title: 'Getting Started', icon: BookOpen },
  { id: 'creating-flags', title: 'Creating Flags', icon: Flag },
  { id: 'targeting-rules', title: 'Targeting Rules', icon: Users },
  { id: 'risk-review', title: 'Release Risk Review', icon: ShieldAlert },
  { id: 'rollbacks', title: 'Rollbacks & Kill Switch', icon: RotateCcw },
  { id: 'audit-logs', title: 'Audit Logs', icon: ScrollText },
  { id: 'experiments', title: 'Experiments', icon: FlaskConical },
  { id: 'calendar', title: 'Change Calendar', icon: Calendar },
  { id: 'api', title: 'API Integration', icon: Code },
];

const CONTENT: Record<string, { title: string; body: { heading: string; text: string }[] }> = {
  'getting-started': {
    title: 'Getting Started',
    body: [
      { heading: 'Welcome to Flag Governor', text: 'Flag Governor is a feature flag management and progressive-delivery platform that helps teams release safely, govern experiments, and maintain operational control over their feature flags.' },
      { heading: 'Core Concepts', text: 'A feature flag is a toggle that controls who sees a feature. Flags can be boolean (on/off), percentage-based (roll out to X% of users), multivariate (A/B/C variants), or targeted (specific users, tenants, or environments).' },
      { heading: 'Environments', text: 'Each organization has multiple environments (Production, Staging, Development). A flag can be enabled in one environment but disabled in another, with independent rollout percentages and targeting rules.' },
      { heading: 'Your First Flag', text: 'Navigate to Feature Flags, click "New Flag", choose a type, assign it to a service, and set an expiration date. The flag will be created in a disabled state across all environments. You can then enable it per environment with the desired rollout percentage.' },
    ],
  },
  'creating-flags': {
    title: 'Creating Flags',
    body: [
      { heading: 'Flag Types', text: 'Boolean: Simple on/off toggle. Percentage: Roll out to a percentage of users. Multivariate: Serve different variants (A/B/C). User Targeted: Target specific user segments by attributes. Tenant Targeted: Target specific tenants. Environment Targeted: Enable only in specific environments.' },
      { heading: 'Best Practices', text: 'Always assign an owner to every flag. Set an expiration date so flags do not become permanent technical debt. Use descriptive keys (e.g. "new-checkout-flow") that match your codebase references.' },
      { heading: 'Variants', text: 'For multivariate flags, define variants with weights that sum to 100. Each variant has a key, display name, and weight. The evaluation engine uses a deterministic hash to assign users to variants consistently.' },
    ],
  },
  'targeting-rules': {
    title: 'Targeting Rules',
    body: [
      { heading: 'Rule Structure', text: 'Each rule has an attribute (e.g. "plan"), an operator (e.g. "equals"), and a value (e.g. "enterprise"). Rules are AND-ed together — all must match for the flag to be enabled.' },
      { heading: 'Available Attributes', text: 'user_id, role, plan, country, organization, tenant, app_version, and any custom attributes you pass in the user context.' },
      { heading: 'Operators', text: 'equals, not_equals, in, not_in, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, starts_with, regex.' },
      { heading: 'Evaluation Order', text: 'If the flag is killed, it returns disabled immediately. If disabled in the environment, it returns disabled. If targeting rules do not match, it returns disabled. Otherwise, the rollout percentage and variant logic apply.' },
    ],
  },
  'risk-review': {
    title: 'Release Risk Review',
    body: [
      { heading: 'How It Works', text: 'The Risk Review page scores every active flag-environment combination on a 0-100 scale using weighted factors. The score maps to one of four recommendations: Safe to Proceed, Proceed with Caution, Require Approval, or Block Release.' },
      { heading: 'Risk Factors', text: 'Rollout percentage (25% weight): Higher percentages affect more users. Environment (20%): Production is riskier than staging. Service criticality (20%): Critical services carry more risk. Error rate (15%): Recent service error rates. SLO status (10%): Meeting, at risk, or breaching. Rollback availability (5%): Missing rollback plans add risk. Flag age (5%): Older flags accumulate debt. Missing owner or expiry (10%): Unmanaged flags are risky.' },
      { heading: 'Recommendations', text: 'Safe (0-34): Standard monitoring applies. Caution (35-59): Monitor closely, ensure rollback is ready. Approval (60-79): A manager or admin must approve before proceeding. Block (80+): Do not proceed without resolving blocking issues.' },
      { heading: 'Approvals', text: 'Managers and admins can approve rollouts that require approval. The approval is recorded with the approver and timestamp in the audit log.' },
    ],
  },
  'rollbacks': {
    title: 'Rollbacks & Kill Switch',
    body: [
      { heading: 'Kill Switch', text: 'The kill switch instantly disables a flag across ALL environments. It is the emergency brake — use it when a flag is causing problems in production. The action is logged and cannot be undone without a rollback.' },
      { heading: 'Rollback', text: 'After a kill switch is activated, the rollback workflow restores the flag to its previous known-good state. The previous state is captured when the kill switch fires, so rollback always returns to the configuration that was live before the emergency.' },
      { heading: 'When to Use', text: 'Use the kill switch for active incidents (error spikes, broken features, customer complaints). Use rollback once the issue is understood and you are confident the previous state is safe. Both actions are fully audited.' },
    ],
  },
  'audit-logs': {
    title: 'Audit Logs',
    body: [
      { heading: 'What Is Logged', text: 'Every flag change is recorded: creation, environment config updates, kill switch activation, rollback, risk approval, and scheduled change execution. Each entry includes who made the change, what changed (before/after), when, and why.' },
      { heading: 'Filtering', text: 'Filter audit logs by action type, specific flag, or search by reason text. Logs are retained indefinitely and can only be deleted by organization admins.' },
    ],
  },
  'experiments': {
    title: 'Experiments',
    body: [
      { heading: 'Running Experiments', text: 'Experiments are linked to multivariate flags. Each variant tracks sample size, conversions, conversion rate, and a confidence interval. The system declares a winner when one variant outperforms the control with statistical significance.' },
      { heading: 'Metrics', text: 'Define a primary metric (e.g. "Daily Active Users") for each experiment. The metric description helps your team understand what success looks like.' },
      { heading: 'Reading Results', text: 'Each variant row shows its conversion rate and confidence interval. The winner badge highlights the best-performing variant. The lift over control shows the percentage improvement.' },
    ],
  },
  'calendar': {
    title: 'Change Calendar',
    body: [
      { heading: 'Scheduling Changes', text: 'Schedule flag changes in advance to coordinate releases across your team. Each scheduled change has a flag, environment, action, date, and optional notes.' },
      { heading: 'Calendar View', text: 'The calendar shows all scheduled changes color-coded by action type. Click through months to see past and future changes. The upcoming list shows the next 8 pending changes.' },
    ],
  },
  'api': {
    title: 'API Integration',
    body: [
      { heading: 'Evaluation Endpoint', text: 'POST to the evaluate-flags edge function with your org slug, environment name, API key, and user context. The response includes every active flag with its enabled state, variant, and reason.' },
      { heading: 'Authentication', text: 'Pass your API key in the request body. API keys are scoped to an environment and can be revoked at any time from the API Keys page.' },
      { heading: 'SDK', text: 'Use the SDK Examples page for copy-paste code in JavaScript, Python, or cURL. The SDK wraps the REST API and provides a clean client interface.' },
    ],
  },
};

export function DocsPage() {
  const [active, setActive] = useState('getting-started');
  const content = CONTENT[active];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">Guides and references for using Flag Governor</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="p-3 lg:col-span-1 h-fit sticky top-6">
          <div className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    active === s.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active === s.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  {s.title}
                  {active === s.id && <ChevronRight className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Content */}
        <Card className="p-6 lg:col-span-3">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{content.title}</h2>
          <div className="space-y-5">
            {content.body.map((section, i) => (
              <div key={i}>
                <h3 className="text-base font-semibold text-gray-900 mb-1.5">{section.heading}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{section.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
