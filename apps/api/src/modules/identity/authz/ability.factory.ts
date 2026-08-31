import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { ShopRole } from '@jokko/contracts';

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subject = 'Shop' | 'Product' | 'Order' | 'Message' | 'Member' | 'all';
export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Capacités d'un membre au sein de SA boutique. Le bornage à la boutique est
 * assuré en amont (TenantContext + RLS) ; l'ability décrit le « quoi », pas le « où ».
 */
export function abilityForRole(role: ShopRole): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (role) {
    case 'owner':
    case 'admin':
      can('manage', 'all');
      break;
    case 'staff':
      can('manage', 'Product');
      can('manage', 'Order');
      can('manage', 'Message');
      can('read', 'Shop');
      break;
    case 'viewer':
      can('read', 'all');
      break;
  }

  return build();
}
