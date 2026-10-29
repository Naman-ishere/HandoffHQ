/**
 * Fictional Demo Personas & Delivery Owners for HandoffHQ.
 * NOTE: Top-bar persona switching is a frictionless hackathon demo mechanism,
 * NOT real authentication. Authorization rules are enforced in domain & service logic.
 */

export const DEMO_USERS = [
  {
    id: 'usr_aarav',
    name: 'Aarav Mehta',
    role: 'sales',
    title: 'Account Executive',
    badgeLabel: 'Sales',
  },
  {
    id: 'usr_priya',
    name: 'Priya Nair',
    role: 'delivery',
    title: 'Delivery Lead',
    badgeLabel: 'Delivery',
  },
  {
    id: 'usr_vikram',
    name: 'Vikram Desai',
    role: 'ops',
    title: 'Head of Agency Ops',
    badgeLabel: 'Ops',
  },
];

export const DELIVERY_OWNERS = [
  {
    id: 'usr_priya',
    name: 'Priya Nair (Delivery Lead)',
  },
  {
    id: 'usr_rohan',
    name: 'Rohan Kapoor (Senior Technical PM)',
  },
];

export const DEFAULT_DEMO_USER = DEMO_USERS[0];

