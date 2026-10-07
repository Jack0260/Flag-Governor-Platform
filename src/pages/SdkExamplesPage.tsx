import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { Copy, Check, Code, Terminal } from 'lucide-react';

export function SdkExamplesPage() {
  const { activeOrg } = useAuth();
  const [lang, setLang] = useState<'javascript' | 'python' | 'curl'>('javascript');
  const [copied, setCopied] = useState(false);

  const orgSlug = activeOrg?.slug ?? 'demo-org';

  const examples: Record<string, string> = {
    javascript: `import { FlagGovernorClient } from '@flaggovernor/sdk';

const client = new FlagGovernorClient({
  orgSlug: '${orgSlug}',
  environment: 'Production',
  apiKey: 'fg_prod_your_api_key_here',
});

// Evaluate a single flag
const result = await client.evaluate('new-checkout-flow', {
  user_id: 'user-123',
  plan: 'enterprise',
  country: 'US',
});

console.log(result.enabled);  // true or false
console.log(result.variant);  // null or variant key

// Evaluate all flags for a user context
const allFlags = await client.evaluateAll({
  user_id: 'user-123',
  role: 'admin',
  plan: 'enterprise',
});

for (const [key, result] of Object.entries(allFlags)) {
  console.log(key, result.enabled);
}`,
    python: `from flag_governor import FlagGovernorClient

client = FlagGovernorClient(
    org_slug="${orgSlug}",
    environment="Production",
    api_key="fg_prod_your_api_key_here",
)

# Evaluate a single flag
result = client.evaluate("new-checkout-flow", {
    "user_id": "user-123",
    "plan": "enterprise",
    "country": "US",
})

print(result["enabled"])  # True or False
print(result["variant"])  # None or variant key

# Evaluate all flags
all_flags = client.evaluate_all({
    "user_id": "user-123",
    "role": "admin",
    "plan": "enterprise",
})

for key, result in all_flags.items():
    print(key, result["enabled"])`,
    curl: `# Evaluate flags via the REST API

curl -X POST \\
  ${window.location.origin.includes('localhost') ? 'https://your-project.supabase.co' : ''}/functions/v1/evaluate-flags \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -d '{
    "org_slug": "${orgSlug}",
    "environment_name": "Production",
    "api_key": "fg_prod_your_api_key_here",
    "user_context": {
      "user_id": "user-123",
      "plan": "enterprise",
      "country": "US",
      "role": "admin"
    }
  }'

# Response:
# {
#   "organization": "${orgSlug}",
#   "environment": "Production",
#   "flags": {
#     "new-checkout-flow": { "enabled": true, "variant": null, "reason": "enabled" },
#     "dark-mode-ui": { "enabled": true, "variant": null, "reason": "enabled" }
#   }
# }`,
  };

  const copyCode = () => {
    navigator.clipboard.writeText(examples[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langs = [
    { id: 'javascript' as const, label: 'JavaScript', icon: Code },
    { id: 'python' as const, label: 'Python', icon: Code },
    { id: 'curl' as const, label: 'cURL', icon: Terminal },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SDK Usage Examples</h1>
        <p className="text-sm text-gray-500 mt-1">Code snippets for integrating flag evaluation into your applications</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {langs.map((l) => {
              const Icon = l.icon;
              return (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${lang === l.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  <Icon className="w-4 h-4" /> {l.label}
                </button>
              );
            })}
          </div>
          <Button variant="secondary" size="sm" onClick={copyCode}>
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
          </Button>
        </div>
        <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-gray-100 font-mono leading-relaxed">
          <code>{examples[lang]}</code>
        </pre>
      </Card>

      {/* Integration guide */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Steps</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Create an API key', desc: 'Go to API Keys page and create a key for your target environment.' },
            { step: '2', title: 'Install the SDK', desc: 'Install the Flag Governor SDK in your application using npm, pip, or use the REST API directly.' },
            { step: '3', title: 'Initialize the client', desc: 'Pass your org slug, environment name, and API key to create a client instance.' },
            { step: '4', title: 'Evaluate flags', desc: 'Call evaluate() with a flag key and user context to get real-time results.' },
            { step: '5', title: 'Handle the result', desc: 'Use the enabled boolean and variant string to control your application behavior.' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{s.step}</div>
              <div>
                <div className="text-sm font-medium text-gray-900">{s.title}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Supported attributes */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Supported User Context Attributes</h2>
        <div className="flex flex-wrap gap-2">
          {['user_id', 'role', 'plan', 'country', 'organization', 'tenant', 'app_version', 'custom attributes'].map((attr) => (
            <Badge key={attr} className="bg-blue-50 text-blue-700 border-blue-100 font-mono">{attr}</Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
