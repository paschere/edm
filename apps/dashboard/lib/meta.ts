const META_TOKEN = process.env.META_ACCESS_TOKEN!;
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID!;
const PAGE_ID = process.env.META_PAGE_ID!;
const INSTAGRAM_ID = process.env.META_INSTAGRAM_ACCOUNT_ID!;
const PIXEL_ID = process.env.META_PIXEL_ID!;
const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function metaFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", META_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
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
  roas: number;
  reach: number;
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

export interface MetaStats {
  campaigns: MetaCampaign[];
  totalSpend: number;
  totalRoas: number;
  totalReach: number;
  page: MetaPageInsights;
  instagram: MetaInstagramInsights;
  pixel: MetaPixelStats;
}

export async function getMetaStats(): Promise<MetaStats> {
  const results = await Promise.allSettled([
    metaFetch<{ data: RawCampaign[] }>(`/${AD_ACCOUNT_ID}/campaigns`, {
      fields: "id,name,status,insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,purchase_roas,reach}",
      effective_status: '["ACTIVE","PAUSED"]',
      limit: "50",
    }),
    metaFetch<{ data: RawInsight[] }>(`/${PAGE_ID}/insights`, {
      metric: "page_impressions,page_reach,page_engaged_users,page_views_total",
      period: "day",
      date_preset: "last_30d",
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
  ]);

  const campaigns = results[0].status === "fulfilled"
    ? parseCampaigns(results[0].value.data)
    : [];

  const pageInsights = results[1].status === "fulfilled" ? results[1].value.data : [];
  const pageInfo = results[2].status === "fulfilled" ? results[2].value : null;
  const igInfo = results[3].status === "fulfilled" ? results[3].value : null;
  const igInsights = results[4].status === "fulfilled" ? results[4].value.data : [];

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

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
  const totalRoas =
    campaigns.length > 0
      ? campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.filter((c) => c.roas > 0).length
      : 0;

  return {
    campaigns,
    totalSpend,
    totalRoas: isFinite(totalRoas) ? totalRoas : 0,
    totalReach,
    page,
    instagram,
    pixel: { pageViews: 0, addToCart: 0, initiateCheckout: 0, purchases: 0 },
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
  purchase_roas?: { action_type: string; value: string }[];
  reach: string;
}

interface RawInsight {
  name: string;
  values: { value: number }[];
}

function parseCampaigns(raw: RawCampaign[]): MetaCampaign[] {
  return raw.map((c) => {
    const i = c.insights?.data[0];
    const roasEntry = i?.purchase_roas?.find((r) => r.action_type === "omni_purchase");
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      spend: parseFloat(i?.spend ?? "0"),
      impressions: parseInt(i?.impressions ?? "0"),
      clicks: parseInt(i?.clicks ?? "0"),
      ctr: parseFloat(i?.ctr ?? "0"),
      cpc: parseFloat(i?.cpc ?? "0"),
      roas: parseFloat(roasEntry?.value ?? "0"),
      reach: parseInt(i?.reach ?? "0"),
    };
  });
}

function sumInsight(data: RawInsight[], name: string): number {
  const metric = data.find((d) => d.name === name);
  if (!metric) return 0;
  return metric.values.reduce((s, v) => s + (v.value as number), 0);
}
