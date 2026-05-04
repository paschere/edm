const META_TOKEN = process.env.META_ACCESS_TOKEN!;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID!;
const PAGE_ID = process.env.META_PAGE_ID!;
const INSTAGRAM_ID = process.env.META_INSTAGRAM_ACCOUNT_ID!;
const GRAPH_BASE = "https://graph.facebook.com/v25.0";

async function metaFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", META_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Meta API error: ${res.status} ${path}`);
  return res.json();
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  roas: number;
  reach: number;
  purchases: number;
  cpa: number;
}

export interface MetaPageInsights {
  impressions: number;
  reach: number;
  engagedUsers: number;
  pageViews: number;
  followers: number;
}

export interface MetaInstagramInsights {
  followers: number;
  impressions: number;
  reach: number;
  profileViews: number;
}

export interface MetaPixelStats {
  pageViews: number;
  addToCart: number;
  initiateCheckout: number;
  purchases: number;
}

export interface MetaDailySpend {
  date: string;
  value: number;
}

export interface MetaStats {
  campaigns: MetaCampaign[];
  totalSpend: number;
  totalRoas: number;
  totalReach: number;
  totalImpressions: number;
  totalPurchases: number;
  avgCPM: number;
  avgFrequency: number;
  page: MetaPageInsights;
  instagram: MetaInstagramInsights;
  pixel: MetaPixelStats;
  dailySpend: MetaDailySpend[];
  prevSpend: number;
  prevRoas: number;
}

function toDatePreset(days: number): string {
  if (days === 7) return "last_7d";
  if (days === 90) return "last_90d";
  return "last_30d";
}

function toTimeRange(offsetDays: number, days: number): string {
  const until = new Date(Date.now() - offsetDays * 86400000);
  const since = new Date(until.getTime() - days * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return JSON.stringify({ since: fmt(since), until: fmt(until) });
}

export async function getMetaStats(days = 30): Promise<MetaStats> {
  const preset = toDatePreset(days);
  const prevTimeRange = toTimeRange(days, days); // previous period

  const results = await Promise.allSettled([
    metaFetch<{ data: RawCampaign[] }>(`/${AD_ACCOUNT_ID}/campaigns`, {
      fields: `id,name,status,insights.date_preset(${preset}){spend,impressions,clicks,ctr,cpc,cpm,frequency,purchase_roas,reach,actions}`,
      effective_status: '["ACTIVE","PAUSED"]',
      limit: "50",
    }),
    metaFetch<{ data: RawInsight[] }>(`/${PAGE_ID}/insights`, {
      metric: "page_impressions,page_reach,page_engaged_users,page_views_total",
      period: "day",
      date_preset: preset,
    }),
    metaFetch<{ followers_count: number; name: string }>(`/${PAGE_ID}`, {
      fields: "followers_count",
    }),
    metaFetch<{ followers_count: number }>(`/${INSTAGRAM_ID}`, {
      fields: "followers_count",
    }),
    metaFetch<{ data: RawInsight[] }>(`/${INSTAGRAM_ID}/insights`, {
      metric: "impressions,reach,profile_views",
      period: "days_28",
    }),
    metaFetch<{ data: { date_start: string; spend: string }[] }>(
      `/${AD_ACCOUNT_ID}/insights`,
      {
        time_increment: "1",
        date_preset: preset,
        fields: "date_start,spend",
        level: "account",
      }
    ),
    // Previous period account-level spend + ROAS for comparison
    metaFetch<{ data: { spend: string; purchase_roas?: { value: string }[] }[] }>(
      `/${AD_ACCOUNT_ID}/insights`,
      {
        time_range: prevTimeRange,
        fields: "spend,purchase_roas",
        level: "account",
      }
    ),
  ]);

  const campaigns = results[0].status === "fulfilled"
    ? parseCampaigns(results[0].value.data)
    : [];

  const pageInsights = results[1].status === "fulfilled" ? results[1].value.data : [];
  const pageInfo = results[2].status === "fulfilled" ? results[2].value : null;
  const igInfo = results[3].status === "fulfilled" ? results[3].value : null;
  const igInsights = results[4].status === "fulfilled" ? results[4].value.data : [];
  const rawDailySpend = results[5].status === "fulfilled" ? results[5].value.data : [];
  const prevInsights  = results[6].status === "fulfilled" ? results[6].value.data : [];
  const prevSpend = prevInsights.reduce((s, r) => s + parseFloat(r.spend ?? "0"), 0);
  const prevRoas  = prevInsights[0]?.purchase_roas?.[0]?.value
    ? parseFloat(prevInsights[0].purchase_roas[0].value)
    : 0;

  const page: MetaPageInsights = {
    impressions: sumInsight(pageInsights, "page_impressions"),
    reach: sumInsight(pageInsights, "page_reach"),
    engagedUsers: sumInsight(pageInsights, "page_engaged_users"),
    pageViews: sumInsight(pageInsights, "page_views_total"),
    followers: pageInfo?.followers_count ?? 0,
  };

  const instagram: MetaInstagramInsights = {
    followers: igInfo?.followers_count ?? 0,
    impressions: sumInsight(igInsights, "impressions"),
    reach: sumInsight(igInsights, "reach"),
    profileViews: sumInsight(igInsights, "profile_views"),
  };

  const activeCampaigns = campaigns.filter((c) => c.spend > 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);

  const roasCampaigns = campaigns.filter((c) => c.roas > 0);
  const totalRoas = roasCampaigns.length > 0
    ? roasCampaigns.reduce((s, c) => s + c.roas, 0) / roasCampaigns.length
    : 0;

  const cpmCampaigns = activeCampaigns.filter((c) => c.cpm > 0);
  const avgCPM = cpmCampaigns.length > 0
    ? cpmCampaigns.reduce((s, c) => s + c.cpm, 0) / cpmCampaigns.length
    : 0;

  const freqCampaigns = activeCampaigns.filter((c) => c.frequency > 0);
  const avgFrequency = freqCampaigns.length > 0
    ? freqCampaigns.reduce((s, c) => s + c.frequency, 0) / freqCampaigns.length
    : 0;

  const dailySpend: MetaDailySpend[] = rawDailySpend
    .map((d) => ({ date: d.date_start, value: parseFloat(d.spend) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    campaigns,
    totalSpend,
    totalRoas: isFinite(totalRoas) ? totalRoas : 0,
    totalReach,
    totalImpressions,
    totalPurchases,
    avgCPM: isFinite(avgCPM) ? avgCPM : 0,
    avgFrequency: isFinite(avgFrequency) ? avgFrequency : 0,
    page,
    instagram,
    pixel: { pageViews: 0, addToCart: 0, initiateCheckout: 0, purchases: 0 },
    dailySpend,
    prevSpend,
    prevRoas,
  };
}

interface RawCampaign {
  id: string;
  name: string;
  status: string;
  insights?: { data: RawCampaignInsights[] };
}

interface RawCampaignInsights {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  frequency: string;
  purchase_roas?: { action_type: string; value: string }[];
  reach: string;
  actions?: { action_type: string; value: string }[];
}

interface RawInsight {
  name: string;
  values: { value: number }[];
}

function parseCampaigns(raw: RawCampaign[]): MetaCampaign[] {
  return raw.map((c) => {
    const i = c.insights?.data[0];
    const roasEntry = i?.purchase_roas?.find((r) => r.action_type === "omni_purchase");
    const purchaseAction = i?.actions?.find(
      (a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase"
    );
    const purchases = parseInt(purchaseAction?.value ?? "0");
    const spend = parseFloat(i?.spend ?? "0");
    const cpa = purchases > 0 ? spend / purchases : 0;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      spend,
      impressions: parseInt(i?.impressions ?? "0"),
      clicks: parseInt(i?.clicks ?? "0"),
      ctr: parseFloat(i?.ctr ?? "0"),
      cpc: parseFloat(i?.cpc ?? "0"),
      cpm: parseFloat(i?.cpm ?? "0"),
      frequency: parseFloat(i?.frequency ?? "0"),
      roas: parseFloat(roasEntry?.value ?? "0"),
      reach: parseInt(i?.reach ?? "0"),
      purchases,
      cpa,
    };
  });
}

function sumInsight(data: RawInsight[], name: string): number {
  const metric = data.find((d) => d.name === name);
  if (!metric) return 0;
  return metric.values.reduce((s, v) => s + (v.value as number), 0);
}
