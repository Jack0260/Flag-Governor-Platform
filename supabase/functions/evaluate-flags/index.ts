import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TargetingRule {
  attribute: string;
  operator: string;
  value: unknown;
}

interface UserContext {
  user_id?: string;
  role?: string;
  plan?: string;
  country?: string;
  organization?: string;
  tenant?: string;
  app_version?: string;
  [key: string]: unknown;
}

interface FlagEnvRow {
  flag_id: string;
  enabled: boolean;
  rollout_percentage: number;
  rules: TargetingRule[];
  served_variant: string | null;
  flag_key: string;
  flag_name: string;
  flag_type: string;
  is_killed: boolean;
}

function evaluateRule(rule: TargetingRule, ctx: UserContext): boolean {
  const attrValue = ctx[rule.attribute];
  if (attrValue === undefined) return false;

  switch (rule.operator) {
    case "equals":
      return String(attrValue) === String(rule.value);
    case "not_equals":
      return String(attrValue) !== String(rule.value);
    case "in":
      return Array.isArray(rule.value) && rule.value.some((v) => String(v) === String(attrValue));
    case "not_in":
      return Array.isArray(rule.value) && !rule.value.some((v) => String(v) === String(attrValue));
    case "greater_than":
      return Number(attrValue) > Number(rule.value);
    case "less_than":
      return Number(attrValue) < Number(rule.value);
    case "greater_than_or_equal":
      return Number(attrValue) >= Number(rule.value);
    case "less_than_or_equal":
      return Number(attrValue) <= Number(rule.value);
    case "contains":
      return String(attrValue).includes(String(rule.value));
    case "starts_with":
      return String(attrValue).startsWith(String(rule.value));
    case "regex":
      try {
        return new RegExp(String(rule.value)).test(String(attrValue));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateRules(rules: TargetingRule[], ctx: UserContext): boolean {
  if (!rules || rules.length === 0) return true;
  return rules.every((rule) => evaluateRule(rule, ctx));
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function isUserInRollout(userId: string | undefined, flagKey: string, percentage: number): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;
  const bucket = hashString(`${flagKey}:${userId ?? "anonymous"}`) % 100;
  return bucket < percentage;
}

function pickVariant(flagKey: string, userId: string | undefined, variants: { key: string; weight: number }[]): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight === 0) return variants[0]?.key ?? "control";
  const bucket = hashString(`${flagKey}:${userId ?? "anonymous"}`) % totalWeight;
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight;
    if (bucket < cumulative) return v.key;
  }
  return variants[variants.length - 1]?.key ?? "control";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const { org_slug, environment_name, user_context, api_key } = body as {
      org_slug?: string;
      environment_name?: string;
      user_context?: UserContext;
      api_key?: string;
    };

    if (!org_slug || !environment_name) {
      return new Response(
        JSON.stringify({ error: "org_slug and environment_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ctx: UserContext = user_context ?? {};
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", org_slug)
      .maybeSingle();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: env, error: envError } = await supabase
      .from("environments")
      .select("id")
      .eq("org_id", org.id)
      .eq("name", environment_name)
      .maybeSingle();

    if (envError || !env) {
      return new Response(
        JSON.stringify({ error: "Environment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: flagEnvs, error: feError } = await supabase
      .from("flag_environments")
      .select(`
        flag_id,
        enabled,
        rollout_percentage,
        rules,
        served_variant,
        flags!inner (
          id,
          key,
          name,
          type,
          is_killed,
          status
        )
      `)
      .eq("environment_id", env.id)
      .eq("flags.org_id", org.id)
      .eq("flags.status", "active");

    if (feError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch flags" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flagIds = (flagEnvs ?? []).map((fe: any) => fe.flag_id);

    let variantsMap: Record<string, { key: string; weight: number }[]> = {};
    if (flagIds.length > 0) {
      const { data: variants } = await supabase
        .from("flag_variants")
        .select("flag_id, key, weight, sort_order")
        .in("flag_id", flagIds)
        .order("sort_order");

      variantsMap = (variants ?? []).reduce((acc: Record<string, { key: string; weight: number }[]>, v: any) => {
        if (!acc[v.flag_id]) acc[v.flag_id] = [];
        acc[v.flag_id].push({ key: v.key, weight: v.weight });
        return acc;
      }, {});
    }

    const results: Record<string, { enabled: boolean; variant: string | null; reason: string }> = {};

    for (const fe of flagEnvs ?? []) {
      const flag = (fe as any).flags;
      if (!flag) continue;

      if (flag.is_killed) {
        results[flag.key] = { enabled: false, variant: null, reason: "kill_switch_active" };
        continue;
      }

      if (!fe.enabled) {
        results[flag.key] = { enabled: false, variant: null, reason: "flag_disabled_in_environment" };
        continue;
      }

      const rules = fe.rules as TargetingRule[];
      if (!evaluateRules(rules, ctx)) {
        results[flag.key] = { enabled: false, variant: null, reason: "targeting_rules_not_matched" };
        continue;
      }

      if (flag.type === "percentage" || flag.type === "boolean") {
        const inRollout = isUserInRollout(ctx.user_id, flag.key, fe.rollout_percentage);
        results[flag.key] = {
          enabled: inRollout,
          variant: null,
          reason: inRollout ? "enabled" : "not_in_rollout",
        };
        continue;
      }

      if (flag.type === "multivariate") {
        const variants = variantsMap[fe.flag_id] ?? [];
        if (variants.length === 0) {
          results[flag.key] = { enabled: true, variant: fe.served_variant ?? "control", reason: "enabled" };
        } else {
          const variant = pickVariant(flag.key, ctx.user_id, variants);
          results[flag.key] = { enabled: true, variant, reason: "enabled" };
        }
        continue;
      }

      results[flag.key] = { enabled: true, variant: fe.served_variant, reason: "enabled" };
    }

    if (api_key) {
      try {
        const { data: keyRecord } = await supabase
          .from("api_keys")
          .select("id")
          .eq("key_hash", api_key)
          .is("revoked_at", null)
          .maybeSingle();

        if (keyRecord) {
          await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);
        }
      } catch {
        // best-effort
      }
    }

    return new Response(
      JSON.stringify({
        organization: org_slug,
        environment: environment_name,
        evaluated_at: new Date().toISOString(),
        flags: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
