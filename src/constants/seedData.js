/**
 * Pre-seeded fictional agency handovers for HandoffHQ.
 * All client names, links, and project details are strictly fictional.
 */

export const ACME_SAMPLE_SCOPE =
  'Full UX/UI redesign and Webflow migration for 12 core marketing pages, blog CMS templates, technical SEO 301 redirects, and WCAG 2.1 AA accessibility compliance.';

export const DEFAULT_AGENCY_DEPENDENCIES = [
  {
    id: 'dep-tpl-1',
    title: 'Approved Brand Guidelines & Vector Logo Kit',
    is_mandatory: true,
    is_resolved: false,
  },
  {
    id: 'dep-tpl-2',
    title: 'Production Environment & Hosting Admin Access',
    is_mandatory: true,
    is_resolved: false,
  },
  {
    id: 'dep-tpl-3',
    title: 'Analytics & Tag Manager Read/Write Permissions',
    is_mandatory: false,
    is_resolved: false,
  },
];

export const INITIAL_HANDOVERS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    project_name: 'Acme Website Redesign',
    client_name: 'Acme Corp',
    deal_value: 45000,
    target_launch_date: '2026-12-15',
    status: 'Blocked',
    scope_summary: 'Redesign site',
    sales_owner_name: 'Aarav Mehta (Sales Rep)',
    delivery_owner_id: null,
    delivery_owner_name: null,
    deliverables: [
      {
        id: 'del-acme-1',
        title: 'Responsive Figma Design System (12 Core Templates)',
        due_date: '2026-11-20',
      },
      {
        id: 'del-acme-2',
        title: 'Webflow CMS Migration, SEO Redirects & Cross-Browser QA',
        due_date: '2026-12-10',
      },
    ],
    dependencies: [
      {
        id: 'dep-acme-1',
        title: 'Approved Brand Guidelines & Vector Logo Kit',
        is_mandatory: true,
        is_resolved: true,
      },
      {
        id: 'dep-acme-2',
        title: 'Production DNS & Webflow Workspace Admin Access',
        is_mandatory: true,
        is_resolved: false,
      },
    ],
    document_links: [
      {
        id: 'doc-acme-1',
        label: 'Signed Master Services Agreement (SOW)',
        url: 'https://notion.so/acme-redesign-sow-2026',
      },
    ],
    activity_logs: [
      {
        id: 'act-acme-2',
        actor_name: 'Aarav Mehta',
        actor_role: 'sales',
        action: 'Verified Brand Guidelines & Vector Logo Kit and attached Signed SOW link (3/6 gates passed).',
        timestamp: '2026-10-29T08:45:00.000Z',
      },
      {
        id: 'act-acme-1',
        actor_name: 'Aarav Mehta',
        actor_role: 'sales',
        action: 'Created handover record from Closed-Won deal ($45,000). Status initialized as Blocked.',
        timestamp: '2026-10-29T08:15:00.000Z',
      },
    ],
    created_at: '2026-10-29T08:15:00.000Z',
    updated_at: '2026-10-29T09:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    project_name: 'FinPulse Mobile App MVP',
    client_name: 'FinPulse FinTech',
    deal_value: 82000,
    target_launch_date: '2027-01-30',
    status: 'Ready for Delivery',
    scope_summary:
      'Design and build React Native iOS/Android MVP for personal expense tracking, Plaid sandbox integration, biometric authentication, and automated push alerts.',
    sales_owner_name: 'Aarav Mehta (Sales Rep)',
    delivery_owner_id: 'usr_priya',
    delivery_owner_name: 'Priya Nair (Delivery Lead)',
    deliverables: [
      {
        id: 'del-fin-1',
        title: 'Interactive Mobile Prototype & API Contract Specification',
        due_date: '2026-11-28',
      },
      {
        id: 'del-fin-2',
        title: 'iOS TestFlight & Android Internal Track MVP Release',
        due_date: '2027-01-20',
      },
    ],
    dependencies: [
      {
        id: 'dep-fin-1',
        title: 'Apple Developer Enterprise & Google Play Console Access',
        is_mandatory: true,
        is_resolved: true,
      },
      {
        id: 'dep-fin-2',
        title: 'Plaid Sandbox API Keys & Staging Environment Credentials',
        is_mandatory: true,
        is_resolved: true,
      },
    ],
    document_links: [
      {
        id: 'doc-fin-1',
        label: 'Signed Master SOW & Security Appendix',
        url: 'https://notion.so/finpulse-mobile-mvp-sow',
      },
      {
        id: 'doc-fin-2',
        label: 'Figma Component Library & Wireframes',
        url: 'https://figma.com/file/finpulse-mvp-wireframes',
      },
    ],
    activity_logs: [
      {
        id: 'act-fin-2',
        actor_name: 'Aarav Mehta',
        actor_role: 'sales',
        action: 'Marked handover Ready for Delivery (6/6 readiness gates passed).',
        timestamp: '2026-10-29T07:50:00.000Z',
      },
      {
        id: 'act-fin-1',
        actor_name: 'Aarav Mehta',
        actor_role: 'sales',
        action: 'Created handover record for FinPulse Mobile App MVP ($82,000).',
        timestamp: '2026-10-28T16:20:00.000Z',
      },
    ],
    created_at: '2026-10-28T16:20:00.000Z',
    updated_at: '2026-10-29T07:50:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    project_name: 'Nexus B2B SEO & Content Retainer',
    client_name: 'Nexus Cloud',
    deal_value: 18500,
    target_launch_date: '2026-11-15',
    status: 'Handed Over',
    scope_summary:
      'Comprehensive technical SEO site audit, core web vitals remediation, schema markup implementation, and 8 authoritative pillar articles targeting enterprise cloud buyers.',
    sales_owner_name: 'Aarav Mehta (Sales Rep)',
    delivery_owner_id: 'usr_priya',
    delivery_owner_name: 'Priya Nair (Delivery Lead)',
    deliverables: [
      {
        id: 'del-nex-1',
        title: 'Technical SEO Audit & Core Web Vitals Remediation Plan',
        due_date: '2026-11-05',
      },
      {
        id: 'del-nex-2',
        title: '8 Enterprise Pillar Content Briefs & Published Articles',
        due_date: '2026-11-14',
      },
    ],
    dependencies: [
      {
        id: 'dep-nex-1',
        title: 'Google Search Console & GA4 Admin Property Access',
        is_mandatory: true,
        is_resolved: true,
      },
      {
        id: 'dep-nex-2',
        title: 'Headless CMS Editor Account & Staging Preview Token',
        is_mandatory: true,
        is_resolved: true,
      },
    ],
    document_links: [
      {
        id: 'doc-nex-1',
        label: 'Signed Q4 Retainer Agreement & Keyword Strategy',
        url: 'https://notion.so/nexus-seo-retainer-2026',
      },
    ],
    activity_logs: [
      {
        id: 'act-nex-3',
        actor_name: 'Priya Nair',
        actor_role: 'delivery',
        action: 'Accepted handover into Delivery execution. Transition marked Handed Over.',
        timestamp: '2026-10-28T14:30:00.000Z',
      },
      {
        id: 'act-nex-2',
        actor_name: 'Aarav Mehta',
        actor_role: 'sales',
        action: 'Marked handover Ready for Delivery (6/6 readiness gates passed).',
        timestamp: '2026-10-28T11:10:00.000Z',
      },
      {
        id: 'act-nex-1',
        actor_name: 'Aarav Mehta',
        actor_role: 'sales',
        action: 'Created handover record for Nexus B2B SEO & Content Retainer ($18,500).',
        timestamp: '2026-10-27T15:00:00.000Z',
      },
    ],
    created_at: '2026-10-27T15:00:00.000Z',
    updated_at: '2026-10-28T14:30:00.000Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    project_name: 'VoltEdge Shopify Plus Migration',
    client_name: 'VoltEdge Gear',
    deal_value: 34000,
    target_launch_date: '2026-12-28',
    status: 'Blocked',
    scope_summary: 'Migrate store to Shopify',
    sales_owner_name: 'Aarav Mehta (Sales Rep)',
    delivery_owner_id: null,
    delivery_owner_name: null,
    deliverables: [
      {
        id: 'del-volt-1',
        title: 'Custom Shopify 2.0 Theme & Checkout Extensibility',
        due_date: '2026-12-18',
      },
    ],
    dependencies: [
      {
        id: 'dep-volt-1',
        title: 'Shopify Plus Partner Collaborator Code & ERP Product CSV Export',
        is_mandatory: true,
        is_resolved: false,
      },
    ],
    document_links: [
      {
        id: 'doc-volt-1',
        label: 'Signed Migration Proposal & SKU Architecture Sheet',
        url: 'https://notion.so/voltedge-shopify-plus-proposal',
      },
    ],
    activity_logs: [
      {
        id: 'act-volt-1',
        actor_name: 'Aarav Mehta',
        actor_role: 'sales',
        action: 'Created handover record for VoltEdge Shopify Plus Migration ($34,000). Status initialized as Blocked (2/6 gates passed).',
        timestamp: '2026-10-28T10:00:00.000Z',
      },
    ],
    created_at: '2026-10-28T10:00:00.000Z',
    updated_at: '2026-10-28T10:00:00.000Z',
  },
];

export function cloneSeedHandovers() {
  return JSON.parse(JSON.stringify(INITIAL_HANDOVERS));
}

