import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads, opportunities, quotes, customers, contracts, surveys, designs } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    // Customers
    const [totalCustomersRes] = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const totalCustomers = Number(totalCustomersRes?.count || 0);

    // Leads
    const [totalLeadsRes] = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const totalLeads = Number(totalLeadsRes?.count || 0);

    const [newLeadsRes] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, 'NEW'));
    const newLeads = Number(newLeadsRes?.count || 0);

    const [contactedLeadsRes] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, 'CONTACTED'));
    const contactedLeads = Number(contactedLeadsRes?.count || 0);

    const [convertedLeadsRes] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, 'CONVERTED'));
    const convertedLeads = Number(convertedLeadsRes?.count || 0);

    // Opportunities
    const [totalOppRes] = await db.select({ count: sql<number>`count(*)` }).from(opportunities);
    const totalOpp = Number(totalOppRes?.count || 0);

    const [wonOppRes] = await db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.status, 'WON'));
    const wonOpportunities = Number(wonOppRes?.count || 0);

    const [lostOppRes] = await db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.status, 'LOST'));
    const lostOpportunities = Number(lostOppRes?.count || 0);

    // Pipeline value — active opportunities
    const [pipelineRes] = await db.select({ total: sql<number>`coalesce(sum(${opportunities.estimatedValue}), 0)` })
      .from(opportunities)
      .where(sql`${opportunities.status} NOT IN ('WON', 'LOST')`);
    const pipelineValue = Number(pipelineRes?.total || 0);

    // Won revenue
    const [wonValueRes] = await db.select({ total: sql<number>`coalesce(sum(${opportunities.estimatedValue}), 0)` })
      .from(opportunities)
      .where(eq(opportunities.status, 'WON'));
    const wonRevenue = Number(wonValueRes?.total || 0);

    // Quotes
    const [totalQuotesRes] = await db.select({ count: sql<number>`count(*)` }).from(quotes);
    const totalQuotes = Number(totalQuotesRes?.count || 0);

    const [pendingQuotesRes] = await db.select({ count: sql<number>`count(*)` }).from(quotes).where(eq(quotes.status, 'DRAFT'));
    const pendingQuotes = Number(pendingQuotesRes?.count || 0);

    const [acceptedQuotesRes] = await db.select({ count: sql<number>`count(*)` }).from(quotes).where(eq(quotes.status, 'ACCEPTED'));
    const acceptedQuotes = Number(acceptedQuotesRes?.count || 0);

    // Contracts
    const [totalContractsRes] = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    const totalContracts = Number(totalContractsRes?.count || 0);

    const [signedContractsRes] = await db.select({ count: sql<number>`count(*)` }).from(contracts).where(eq(contracts.status, 'SIGNED'));
    const signedContracts = Number(signedContractsRes?.count || 0);

    // Surveys
    const [totalSurveysRes] = await db.select({ count: sql<number>`count(*)` }).from(surveys);
    const totalSurveys = Number(totalSurveysRes?.count || 0);

    // Designs
    const [totalDesignsRes] = await db.select({ count: sql<number>`count(*)` }).from(designs);
    const totalDesigns = Number(totalDesignsRes?.count || 0);

    // Conversion rate: converted leads / total leads
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // Win rate: won / (won + lost)
    const winRate = (wonOpportunities + lostOpportunities) > 0
      ? Math.round((wonOpportunities / (wonOpportunities + lostOpportunities)) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        // Customers
        totalCustomers,
        // Leads
        totalLeads,
        newLeads,
        contactedLeads,
        convertedLeads,
        conversionRate,
        // Opportunities
        totalOpp,
        wonOpportunities,
        lostOpportunities,
        pipelineValue,
        wonRevenue,
        winRate,
        // Quotes
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        // Contracts
        totalContracts,
        signedContracts,
        // Surveys & Designs
        totalSurveys,
        totalDesigns,
      }
    });
  } catch (error: any) {
    console.error('CRM Dashboard Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
